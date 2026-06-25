const express = require('express');
const router = express.Router();
const pool = require('./database');

// 🟢 [GET] Lấy danh sách yêu cầu gia công
router.get('/machining-history', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM machining_requests ORDER BY id DESC');
        const formattedData = result.rows.map(item => ({
            id: item.order_id,
            database_id: item.id, // ID tăng tự động của Postgres để xóa/sửa
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

// 🛠️ [PUT] CẬP NHẬT TRẠNG THÁI & BÁO GIÁ (SỬA)
router.put('/machining-request/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // Nhận trạng thái mới từ Admin gửi lên

        const query = `UPDATE machining_requests SET status = $1 WHERE order_id = $2`;
        await pool.query(query, [status, id]);

        res.status(200).json({ success: true, message: "Cập nhật trạng thái đơn gia công thành công!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ❌ [DELETE] XÓA ĐƠN GIA CÔNG KHỎI HỆ THỐNG (XÓA)
router.delete('/machining-request/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM machining_requests WHERE order_id = $1', [id]);
        res.status(200).json({ success: true, message: "Đã xóa hồ sơ gia công thành công!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;