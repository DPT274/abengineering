const express = require('express');
const router = express.Router();
const pool = require('./database');

// 🟢 1. API LẤY DANH SÁCH CHI NHÁNH (GET)
// Endpoint thực tế: BASE_URL/api/branches
router.get('/branches', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM branches ORDER BY id DESC');
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error("Lỗi lấy danh sách chi nhánh:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ➕ 2. API TẠO CHI NHÁNH MỚI (POST)
router.post('/branches', async (req, res) => {
    try {
        const { name, address, hotline } = req.body;
        if (!name || !address) {
            return res.status(400).json({ success: false, message: "Tên và địa chỉ không được để trống!" });
        }

        const query = `
            INSERT INTO branches (name, address, hotline)
            VALUES ($1, $2, $3) RETURNING *
        `;
        const result = await pool.query(query, [name.trim(), address.trim(), hotline || ""]);
        res.status(200).json({ success: true, message: "Thêm chi nhánh thành công!", data: result.rows[0] });
    } catch (error) {
        console.error("Lỗi thêm chi nhánh:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 🛠️ 3. API CẬP NHẬT CHI NHÁNH (SỬA - PUT)
router.put('/branches/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, hotline } = req.body;

        const query = `
            UPDATE branches 
            SET name = $1, address = $2, hotline = $3 
            WHERE id = $4
        `;
        const result = await pool.query(query, [name.trim(), address.trim(), hotline, id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy chi nhánh yêu cầu!" });
        }
        res.status(200).json({ success: true, message: "Cập nhật thông tin chi nhánh thành công!" });
    } catch (error) {
        console.error("Lỗi cập nhật chi nhánh:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ❌ 4. API XÓA CHI NHÁNH (DELETE)
router.delete('/branches/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM branches WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy chi nhánh để xóa!" });
        }
        res.status(200).json({ success: true, message: "Đã xóa chi nhánh khỏi hệ thống!" });
    } catch (error) {
        console.error("Lỗi xóa chi nhánh:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;