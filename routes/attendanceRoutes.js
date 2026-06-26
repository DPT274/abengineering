const express = require('express');
const router = express.Router();
const pool = require('./database'); // Đảm bảo đường dẫn chính xác tới file database.js của bạn (Sử dụng PostgreSQL)
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// =========================================================================
// 1. CẤU HÌNH LƯU TRỮ ẢNH (MULTER) - PHỤC VỤ CHẤM CÔNG QUA CAMERA
// =========================================================================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Tạo hoặc trỏ về thư mục public/uploads nằm ở thư mục gốc của dự án
        const uploadDir = path.join(__dirname, '../public/uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Định danh tên file bằng mốc thời gian kèm số ngẫu nhiên để tránh trùng tên ảnh
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // Giới hạn tối đa 10MB mỗi ảnh
});

// API TẢI ẢNH: Nhận file từ Zalo App, lưu vào máy chủ và trả về đường dẫn URL công khai
router.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Không nhận được dữ liệu hình ảnh!' });
        }
        // Tạo link online đầy đủ dạng: https://abengineering.onrender.com/uploads/ten_file.jpg
        const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        return res.status(200).json({ success: true, imageUrl: imageUrl });
    } catch (error) {
        console.error("Lỗi xử lý upload ảnh:", error);
        return res.status(500).json({ success: false, message: 'Lỗi máy chủ trong quá trình xử lý file.' });
    }
});


// =========================================================================
// 2. KÊNH API DÀNH CHO NHÂN VIÊN (THAO TÁC TRÊN ZALO MINI APP)
// =========================================================================

// API CHẤM CÔNG: Lưu thông tin định vị GPS và ảnh minh chứng của thợ máy
router.post('/checkin', async (req, res) => {
    const { phone, name, latitude, longitude, image_url } = req.body;

    if (!phone || !latitude || !longitude) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin tài khoản hoặc dữ liệu định vị GPS!" });
    }

    try {
        // Kiểm tra xem nhân viên này trong ngày hôm nay đã gửi yêu cầu điểm danh chưa
        const checkToday = await pool.query(
            `SELECT * FROM attendances WHERE phone = $1 AND DATE(created_at) = CURRENT_DATE`,
            [phone]
        );

        if (checkToday.rows.length > 0) {
            return res.status(400).json({ success: false, message: "Hôm nay bạn đã gửi yêu cầu điểm danh rồi, vui lòng không gửi lại!" });
        }

        // Mặc định ca mới gửi sẽ ở trạng thái chờ duyệt (pending) và tiền lương cộng thêm ban đầu là 0đ
        const result = await pool.query(
            `INSERT INTO attendances (phone, name, latitude, longitude, image_url, status, salary_added) 
             VALUES ($1, $2, $3, $4, $5, 'pending', 0) RETURNING *`,
            [phone, name || 'Ẩn danh', latitude, longitude, image_url]
        );

        res.status(200).json({ success: true, message: "Gửi yêu cầu chấm công thành công!", data: result.rows[0] });
    } catch (error) {
        console.error("Lỗi API Checkin Nhân viên:", error);
        res.status(500).json({ success: false, message: "Lỗi hệ thống, không thể ghi nhận chấm công lúc này." });
    }
});

// API LỊCH SỬ CÁ NHÂN: Thợ máy tự xem lại lịch sử chấm công và tổng tiền lương nhận được trong tháng
router.get('/my-history/:phone', async (req, res) => {
    const { phone } = req.params;
    try {
        // Lấy danh sách chấm công sắp xếp từ mới nhất đến cũ nhất
        const history = await pool.query(
            `SELECT * FROM attendances WHERE phone = $1 ORDER BY created_at DESC`,
            [phone]
        );

        // Tính tổng tiền lương được duyệt (Bao gồm cả 'approved' - đúng giờ và 'late' - đi muộn) trong tháng hiện tại
        const salaryCalc = await pool.query(
            `SELECT SUM(salary_added) as total_salary 
             FROM attendances 
             WHERE phone = $1 
               AND status IN ('approved', 'late') 
               AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
            [phone]
        );

        res.status(200).json({
            success: true,
            history: history.rows,
            totalSalary: salaryCalc.rows[0].total_salary || 0
        });
    } catch (error) {
        console.error("Lỗi API lấy lịch sử cá nhân:", error);
        res.status(500).json({ success: false, message: "Gặp lỗi khi đồng bộ lịch sử chấm công từ máy chủ." });
    }
});


// =========================================================================
// 3. KÊNH API QUẢN TRỊ TOÀN DIỆN DÀNH CHO ADMIN (HỆ THỐNG DASHBOARD)
// =========================================================================

// [READ] API ADMIN: Lấy toàn bộ danh sách chấm công của xưởng để đối chiếu dữ liệu
router.get('/admin/records', async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM attendances ORDER BY created_at DESC`);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error("Lỗi API Admin lấy danh sách tổng:", error);
        res.status(500).json({ success: false, message: "Không thể tải danh sách bản ghi chấm công." });
    }
});

// [CREATE] API ADMIN: Thêm thủ công một ca làm việc trực tiếp từ màn hình quản trị viên
router.post('/admin/records', async (req, res) => {
    const { phone, name, latitude, longitude, image_url, status, salary_added } = req.body;

    if (!phone || !name) {
        return res.status(400).json({ success: false, message: "Vui lòng nhập tên và thông tin định danh nhân viên!" });
    }

    try {
        // Lưu trực tiếp số tiền lương nhập từ tay ở Admin Form vào Database
        const result = await pool.query(
            `INSERT INTO attendances (phone, name, latitude, longitude, image_url, status, salary_added, created_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *`,
            [phone, name, latitude || '10.7626', longitude || '106.6601', image_url || '', status || 'pending', salary_added || 0]
        );
        res.status(200).json({ success: true, message: "Đã thêm mới bản ghi chấm công thành công!", data: result.rows[0] });
    } catch (error) {
        console.error("Lỗi API Admin thêm mới thủ công:", error);
        res.status(500).json({ success: false, message: "Lỗi hệ thống, không thể thêm bản ghi mới." });
    }
});

// [UPDATE] API ADMIN: Chỉnh sửa thông tin, duyệt trạng thái và cập nhật tiền lương BẰNG TAY linh hoạt
router.put('/admin/records/:id', async (req, res) => {
    const { id } = req.params;
    const { name, phone, latitude, longitude, image_url, status, salary_added } = req.body;

    try {
        // Cập nhật tất cả các trường dữ liệu bao gồm cả số tiền lương nhập thủ công (salary_added)
        const result = await pool.query(
            `UPDATE attendances 
             SET name = $1, phone = $2, latitude = $3, longitude = $4, image_url = $5, status = $6, salary_added = $7 
             WHERE id = $8 RETURNING *`,
            [name, phone, latitude, longitude, image_url, status, salary_added, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Bản ghi chấm công này không tồn tại hoặc đã bị xóa trước đó." });
        }

        res.status(200).json({ success: true, message: "Đã phê duyệt và cập nhật dữ liệu thành công!", data: result.rows[0] });
    } catch (error) {
        console.error("Lỗi API Admin cập nhật/duyệt ca:", error);
        res.status(500).json({ success: false, message: "Lỗi hệ thống, không thể cập nhật thông tin bản ghi." });
    }
});

// [DELETE] API ADMIN: Xóa vĩnh viễn một ca chấm công ra khỏi cơ sở dữ liệu
router.delete('/admin/records/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(`DELETE FROM attendances WHERE id = $1 RETURNING *`, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi cần xóa." });
        }

        res.status(200).json({ success: true, message: "Đã xóa bản ghi chấm công thành công khỏi cơ sở dữ liệu!" });
    } catch (error) {
        console.error("Lỗi API Admin xóa bản ghi:", error);
        res.status(500).json({ success: false, message: "Lỗi hệ thống, không thể thực hiện thao tác xóa dữ liệu." });
    }
});

module.exports = router;