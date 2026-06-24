const express = require('express');
const router = express.Router();
const pool = require('./database'); // Lấy kết nối database cùng thư mục routes

// 1. API Hứng dữ liệu từ Zalo Mini App của User
router.post('/machining-request', async (req, res) => {
    try {
        const { id, date, services, material, fileName, phone, email } = req.body;
        const servicesJson = JSON.stringify(services);

        const query = `
            INSERT INTO machining_requests (order_id, created_at, services, material, file_name, phone, email, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;

        await pool.query(query, [id, date, servicesJson, material, fileName, phone, email, 'Chờ xử lý']);
        res.status(200).json({ success: true, message: "Đã lưu yêu cầu thành công!" });
    } catch (error) {
        console.error("Lỗi lưu yêu cầu gia công:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. API Trả dữ liệu cho trang Admin quản lý
router.get('/machining-history', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM machining_requests ORDER BY id DESC');
        const formattedData = result.rows.map(item => ({
            id: item.order_id,
            date: item.created_at,
            services: typeof item.services === 'string' ? JSON.parse(item.services) : item.services,
            material: item.material,
            fileName: item.file_name,
            phone: item.phone,
            email: item.email,
            status: item.status
        }));
        res.status(200).json(formattedData);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;