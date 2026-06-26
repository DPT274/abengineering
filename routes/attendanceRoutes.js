const express = require('express');
const router = express.Router();
const pool = require('./database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// =========================================================================
// CẤU HÌNH LƯU TRỮ ẢNH (MULTER)
// =========================================================================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../public/uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

// API TẢI ẢNH UP LÊN SERVER
router.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Không nhận được dữ liệu hình ảnh!' });
        }
        const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        return res.status(200).json({ success: true, imageUrl: imageUrl });
    } catch (error) {
        console.error("Lỗi xử lý upload ảnh:", error);
        return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xử lý file.' });
    }
});


// =========================================================================
// KÊNH API CHẤM CÔNG THEO CA (MỚI NÂNG CẤP)
// =========================================================================

// API CHẤM CÔNG ĐA CA: Kiểm tra trùng theo loại ca trong ngày
router.post('/checkin', async (req, res) => {
    const { phone, name, latitude, longitude, image_url, checkin_type } = req.body;

    if (!phone || !latitude || !longitude || !checkin_type) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin tài khoản, định vị hoặc loại ca chấm công!" });
    }

    try {
        // Thay vì chặn cả ngày, giờ chỉ chặn nếu thợ cố tình bấm trùng loại ca (ví dụ: đã Vào ca sáng rồi lại bấm Vào ca sáng tiếp)
        const checkDuplicateType = await pool.query(
            `SELECT * FROM attendances 
             WHERE phone = $1 AND checkin_type = $2 AND DATE(created_at) = CURRENT_DATE`,
            [phone, checkin_type]
        );

        if (checkDuplicateType.rows.length > 0) {
            const typeNames = {
                'morning_in': 'Vào ca sáng', 'morning_out': 'Ra ca sáng',
                'afternoon_in': 'Vào ca chiều', 'afternoon_out': 'Ra ca chiều',
                'ot_in': 'Vào tăng ca', 'ot_out': 'Ra tăng ca'
            };
            return res.status(400).json({
                success: false,
                message: `Hôm nay bạn đã thực hiện thao tác [${typeNames[checkin_type] || checkin_type}] rồi!`
            });
        }

        // Lưu thông tin chấm công kèm loại ca
        const result = await pool.query(
            `INSERT INTO attendances (phone, name, latitude, longitude, image_url, status, salary_added, checkin_type) 
             VALUES ($1, $2, $3, $4, $5, 'pending', 0, $6) RETURNING *`,
            [phone, name || 'Ẩn danh', latitude, longitude, image_url, checkin_type]
        );

        res.status(200).json({ success: true, message: "Gửi yêu cầu chấm công thành công!", data: result.rows[0] });
    } catch (error) {
        console.error("Lỗi API Checkin:", error);
        res.status(500).json({ success: false, message: "Lỗi hệ thống ghi nhận chấm công." });
    }
});

// API LỊCH SỬ CÁ NHÂN: Tổng hợp cả lịch sử chấm công thường và tổng lương tháng
// API LỊCH SỬ CÁ NHÂN
router.get('/my-history/:phone', async (req, res) => {
    const { phone } = req.params;
    try {
        // ĐÃ SỬA: Thêm [phone] vào câu lệnh truy vấn
        const history = await pool.query(
            `SELECT * FROM attendances WHERE phone = $1 ORDER BY created_at DESC`,
            [phone]
        );

        // Tính tổng lương từ các ca làm thông thường được duyệt
        const salaryCalc = await pool.query(
            `SELECT SUM(salary_added) as total_salary FROM attendances 
             WHERE phone = $1 AND status IN ('approved', 'late') 
               AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
            [phone]
        );

        // Tính thêm tổng lương từ lịch trình Tăng Ca đã được duyệt
        const otSalaryCalc = await pool.query(
            `SELECT SUM(salary_added) as total_ot FROM overtime_requests 
             WHERE phone = $1 AND status = 'approved' 
               AND ot_date >= DATE_TRUNC('month', CURRENT_DATE)`,
            [phone] // ĐÃ SỬA: Thêm [phone]
        );

        const totalRegular = parseInt(salaryCalc.rows[0].total_salary) || 0;
        const totalOvertime = parseInt(otSalaryCalc.rows[0].total_ot) || 0;

        res.status(200).json({
            success: true,
            history: history.rows,
            totalSalary: totalRegular + totalOvertime
        });
    } catch (error) {
        console.error("Lỗi API lấy lịch sử cá nhân:", error);
        res.status(500).json({ success: false, message: "Gặp lỗi khi đồng bộ lịch sử chấm công." });
    }
});


// =========================================================================
// KÊNH API ĐĂNG KÝ TĂNG CA (OT) - DÀNH CHO TAB MỚI CỦA USER
// =========================================================================

// Thợ máy gửi đơn yêu cầu tăng ca
router.post('/overtime/request', async (req, res) => {
    const { phone, name, ot_date, ot_hours } = req.body;

    if (!phone || !ot_date || !ot_hours) {
        return res.status(400).json({ success: false, message: "Vui lòng nhập ngày và số giờ muốn tăng ca!" });
    }

    try {
        // Kiểm tra xem ngày đó đã gửi yêu cầu tăng ca chưa để tránh spam
        const checkDup = await pool.query(
            `SELECT * FROM overtime_requests WHERE phone = $1 AND ot_date = $2`,
            [phone, ot_date]
        );

        if (checkDup.rows.length > 0) {
            return res.status(400).json({ success: false, message: "Bạn đã đăng ký tăng ca cho ngày này trước đó rồi!" });
        }

        const result = await pool.query(
            `INSERT INTO overtime_requests (phone, name, ot_date, ot_hours, status, salary_added) 
             VALUES ($1, $2, $3, $4, 'pending', 0) RETURNING *`,
            [phone, name || 'Ẩn danh', ot_date, ot_hours]
        );

        res.status(200).json({ success: true, message: "Đã gửi đơn đăng ký tăng ca lên hệ thống!", data: result.rows[0] });
    } catch (error) {
        console.error("Lỗi đăng ký tăng ca:", error);
        res.status(500).json({ success: false, message: "Lỗi máy chủ không thể gửi đơn tăng ca." });
    }
});

// Thợ máy tự xem danh sách đơn tăng ca của mình
router.get('/overtime/my-requests/:phone', async (req, res) => {
    const { phone } = req.params;
    try {
        const result = await pool.query(
            `SELECT * FROM overtime_requests WHERE phone = $1 ORDER BY ot_date DESC`,
            [phone]
        );
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi tải danh sách tăng ca cá nhân." });
    }
});


// =========================================================================
// KÊNH API ADMIN QUẢN LÝ (DASHBOARD)
// =========================================================================

// Lấy toàn bộ danh sách chấm công thường
router.get('/admin/records', async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM attendances ORDER BY created_at DESC`);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: "Không thể tải danh sách bản ghi chấm công." });
    }
});

// Admin cập nhật/phê duyệt ca chấm công thường
router.put('/admin/records/:id', async (req, res) => {
    const { id } = req.params;
    const { name, phone, latitude, longitude, image_url, status, salary_added, checkin_type } = req.body;
    try {
        const result = await pool.query(
            `UPDATE attendances 
             SET name = $1, phone = $2, latitude = $3, longitude = $4, image_url = $5, status = $6, salary_added = $7, checkin_type = $8 
             WHERE id = $9 RETURNING *`,
            [name, phone, latitude, longitude, image_url, status, salary_added, checkin_type || 'morning_in', id]
        );
        res.status(200).json({ success: true, message: "Cập nhật ca làm việc thành công!", data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi khi duyệt ca làm việc." });
    }
});

// Admin xóa ca chấm công thường
router.delete('/admin/records/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query(`DELETE FROM attendances WHERE id = $1`, [id]);
        res.status(200).json({ success: true, message: "Xóa bản ghi thành công!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi xóa bản ghi." });
    }
});

// [MỚI] API ADMIN: Lấy tất cả danh sách đơn đăng ký tăng ca (OT) của toàn bộ xưởng
router.get('/admin/overtime', async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM overtime_requests ORDER BY ot_date DESC, created_at DESC`);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: "Không thể lấy danh sách đơn tăng ca." });
    }
});

// [MỚI] API ADMIN: Phê duyệt tiền lương và trạng thái đơn tăng ca (OT) của thợ
router.put('/admin/overtime/:id', async (req, res) => {
    const { id } = req.params;
    const { status, salary_added } = req.body; // status: 'approved' hoặc 'rejected', và số tiền thưởng tăng ca tương ứng
    try {
        const result = await pool.query(
            `UPDATE overtime_requests 
             SET status = $1, salary_added = $2 
             WHERE id = $3 RETURNING *`,
            [status, salary_added || 0, id]
        );
        res.status(200).json({ success: true, message: "Đã phê duyệt đơn tăng ca thành công!", data: result.rows[0] });
    } catch (error) {
        console.error("Lỗi duyệt tăng ca:", error);
        res.status(500).json({ success: false, message: "Lỗi hệ thống khi phê duyệt đơn tăng ca." });
    }
});

module.exports = router;