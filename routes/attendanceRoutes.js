const express = require('express');
const router = express.Router();
const pool = require('./database');

// ==========================================
// 1. NHÂN VIÊN GỬI YÊU CẦU ĐIỂM DANH (Zalo App gọi)
// ==========================================
router.post('/checkin', async (req, res) => {
    // Đã thêm image_url để nhận đường dẫn ảnh minh chứng từ Zalo gửi lên
    const { phone, name, latitude, longitude, image_url } = req.body;

    if (!phone || !latitude || !longitude) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin định vị hoặc tài khoản!" });
    }

    try {
        // Kiểm tra xem hôm nay đã điểm danh chưa (tránh spam bấm nhiều lần)
        const checkToday = await pool.query(
            `SELECT * FROM attendances 
             WHERE phone = $1 AND DATE(created_at) = CURRENT_DATE`,
            [phone]
        );

        if (checkToday.rows.length > 0) {
            return res.status(400).json({ success: false, message: "Bạn đã điểm danh trong ngày hôm nay rồi!" });
        }

        // Lưu vào DB với trạng thái 'pending' và lưu kèm link ảnh image_url
        const result = await pool.query(
            `INSERT INTO attendances (phone, name, latitude, longitude, image_url, status) 
             VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
            [phone, name, latitude, longitude, image_url]
        );

        res.status(200).json({ success: true, message: "Đã gửi yêu cầu điểm danh!", data: result.rows[0] });
    } catch (error) {
        console.error("Lỗi điểm danh:", error);
        res.status(500).json({ success: false, error: "Lỗi máy chủ khi điểm danh." });
    }
});

// ==========================================
// 2. LẤY LỊCH SỬ & LƯƠNG CỦA 1 NHÂN VIÊN (Zalo App gọi)
// ==========================================
router.get('/my-history/:phone', async (req, res) => {
    const { phone } = req.params;
    try {
        const history = await pool.query(
            `SELECT * FROM attendances WHERE phone = $1 ORDER BY created_at DESC`,
            [phone]
        );

        // Đã sửa logic: Dùng DATE_TRUNC để chỉ tính tổng lương trong đúng tháng và năm hiện tại
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
        console.error("Lỗi lấy lịch sử:", error);
        res.status(500).json({ success: false, error: "Lỗi hệ thống." });
    }
});

// ==========================================
// 3. API CHO ADMIN DUYỆT ĐIỂM DANH (Admin Web gọi)
// ==========================================
router.put('/admin/approve/:id', async (req, res) => {
    const { id } = req.params;
    const { status, salary_added } = req.body; // status: 'approved', 'late' hoặc 'rejected'

    try {
        const result = await pool.query(
            `UPDATE attendances SET status = $1, salary_added = $2 WHERE id = $3 RETURNING *`,
            [status, salary_added, id]
        );
        res.status(200).json({ success: true, message: "Đã duyệt điểm danh!", data: result.rows[0] });
    } catch (error) {
        console.error("Lỗi duyệt điểm danh:", error);
        res.status(500).json({ success: false, error: "Lỗi hệ thống." });
    }
});

module.exports = router;