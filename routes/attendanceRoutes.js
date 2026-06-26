const express = require('express');
const router = express.Router();
const pool = require('./database');

// 1. NHÂN VIÊN GỬI YÊU CẦU ĐIỂM DANH
router.post('/checkin', async (req, res) => {
    const { phone, name, latitude, longitude, image_url } = req.body;

    if (!phone || !latitude || !longitude) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin định vị hoặc tài khoản!" });
    }

    try {
        const checkToday = await pool.query(
            `SELECT * FROM attendances WHERE phone = $1 AND DATE(created_at) = CURRENT_DATE`,
            [phone]
        );

        if (checkToday.rows.length > 0) {
            return res.status(400).json({ success: false, message: "Hôm nay bạn đã điểm danh rồi!" });
        }

        const result = await pool.query(
            `INSERT INTO attendances (phone, name, latitude, longitude, image_url, status) 
             VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
            [phone, name, latitude, longitude, image_url]
        );

        res.status(200).json({ success: true, message: "Thành công!", data: result.rows[0] });
    } catch (error) {
        console.error("Lỗi:", error);
        res.status(500).json({ success: false, message: "Lỗi Server, vui lòng thử lại." });
    }
});

// 2. LẤY LỊCH SỬ CÁ NHÂN
router.get('/my-history/:phone', async (req, res) => {
    const { phone } = req.params;
    try {
        const history = await pool.query(
            `SELECT * FROM attendances WHERE phone = $1 ORDER BY created_at DESC`,
            [phone]
        );

        const salaryCalc = await pool.query(
            `SELECT SUM(salary_added) as total_salary 
             FROM attendances 
             WHERE phone = $1 AND status IN ('approved', 'late') AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
            [phone]
        );

        res.status(200).json({
            success: true,
            history: history.rows,
            totalSalary: salaryCalc.rows[0].total_salary || 0
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi hệ thống." });
    }
});

// 3. ADMIN LẤY DANH SÁCH & DUYỆT (Gộp luôn vào đây cho gọn)
router.get('/admin/records', async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM attendances ORDER BY created_at DESC`);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi load danh sách" });
    }
});

router.put('/admin/approve/:id', async (req, res) => {
    const { id } = req.params;
    const { status, salary_added } = req.body;
    try {
        const result = await pool.query(
            `UPDATE attendances SET status = $1, salary_added = $2 WHERE id = $3 RETURNING *`,
            [status, salary_added, id]
        );
        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi hệ thống." });
    }
});

module.exports = router;