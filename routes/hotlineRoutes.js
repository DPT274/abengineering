const express = require('express');
const pool = require('./database');

const router = express.Router();

// 1. API: Lấy danh sách hotline (Dùng chung cho Admin và User Zalo)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM hotlines ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error("Lỗi GET hotlines:", err);
        res.status(500).json({ error: 'Lỗi hệ thống khi lấy danh sách đường dây nóng' });
    }
});

// 2. API: Thêm mới đường dây nóng hotline
router.post('/', async (req, res) => {
    try {
        const { name, phone } = req.body;
        if (!name || !phone) {
            return res.status(400).json({ error: 'Vui lòng điền đầy đủ tên và số điện thoại' });
        }

        const newHotline = await pool.query(
            'INSERT INTO hotlines (name, phone) VALUES ($1, $2) RETURNING *',
            [name, phone]
        );
        res.status(201).json(newHotline.rows[0]);
    } catch (err) {
        console.error("Lỗi POST hotline:", err);
        res.status(500).json({ error: 'Lỗi khi thêm số đường dây nóng mới' });
    }
});

// 3. API: Xóa đường dây nóng hotline
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const checkRes = await pool.query('SELECT id FROM hotlines WHERE id = $1', [id]);

        if (checkRes.rows.length === 0) {
            return res.status(404).json({ error: 'Không tìm thấy số đường dây nóng này' });
        }

        await pool.query('DELETE FROM hotlines WHERE id = $1', [id]);
        res.json({ success: true, message: 'Đã xóa hotline thành công' });
    } catch (err) {
        console.error("Lỗi DELETE hotline:", err);
        res.status(500).json({ error: 'Lỗi khi xóa đường dây nóng' });
    }
});

module.exports = router;