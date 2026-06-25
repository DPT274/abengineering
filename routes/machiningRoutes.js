const express = require('express');
const router = express.Router();
const pool = require('./database'); // Giữ nguyên kết nối database pool của bạn

// ==========================================
// 📱 1. API HỨNG YÊU CẦU TỪ USER (POST)
// ==========================================
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

// ==========================================
// 💻 2. API TRẢ LỊCH SỬ ĐƠN CHO TRANG ADMIN VÀ USER (GET)
// ==========================================
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
        console.error("Lỗi lấy dữ liệu lịch sử:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// 🛠️ 3. API CẬP NHẬT TRẠNG THÁI TIẾN ĐỘ ĐƠN (SỬA - PUT)
// ==========================================
router.put('/machining-request/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const query = `
            UPDATE machining_requests 
            SET status = $1 
            WHERE order_id = $2
        `;
        const result = await pool.query(query, [status, id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy hồ sơ yêu cầu!" });
        }

        res.status(200).json({ success: true, message: "Cập nhật tiến độ đơn hàng thành công!" });
    } catch (error) {
        console.error("Lỗi cập nhật trạng thái:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// ❌ 4. API XÓA HỒ SƠ KHỎI HỆ THỐNG (XÓA - DELETE)
// ==========================================
router.delete('/machining-request/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM machining_requests WHERE order_id = $1', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy mã hồ sơ để xóa!" });
        }

        res.status(200).json({ success: true, message: "Đã loại bỏ hồ sơ gia công khỏi hệ thống!" });
    } catch (error) {
        console.error("Lỗi xóa đơn gia công:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;