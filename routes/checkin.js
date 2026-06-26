// routes/checkin.js
const express = require('express');
const router = express.Router();
const pool = require('./database'); // Trỏ đúng file cấu hình DB của bạn

// API Nhận dữ liệu điểm danh từ Zalo App
router.post('/submit', async (req, res) => {
    const { phone, name, image_base64 } = req.body;

    if (!phone || !image_base64) {
        return res.status(400).json({ success: false, message: "Thiếu dữ liệu điểm danh!" });
    }

    try {
        // Lưu thẳng vào Database (Nếu dùng Cloudinary thì up ảnh trước rồi lưu Link)
        const newCheckin = await pool.query(
            `INSERT INTO checkins (user_phone, user_name, image_url) 
             VALUES ($1, $2, $3) RETURNING *`,
            [phone, name || 'Unknown', image_base64]
        );

        res.status(200).json({
            success: true,
            message: "Điểm danh thành công!",
            data: newCheckin.rows[0]
        });

    } catch (error) {
        console.error("Lỗi API Điểm danh:", error);
        res.status(500).json({ success: false, message: "Lỗi máy chủ khi điểm danh." });
    }
});

module.exports = router;