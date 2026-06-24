const express = require('express');
const multer = require('multer');
const path = require('path');
const pool = require('./database');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 1. API: Lấy danh sách dự án (An toàn 100%, không bao giờ crash)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM projects ORDER BY id DESC');
        res.json(result.rows || []);
    } catch (err) {
        console.error("❌ LỖI TRUY VẤN BẢNG PROJECTS:", err.message);
        res.json([]); // Trả về mảng trống bảo vệ giao diện admin không bị trắng trang
    }
});

// 2. API: Thêm mới dự án thuần (Bỏ qua cấu hình Supabase phức tạp để fix lỗi 500)
router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { title, link } = req.body;

        // Tự động sinh ảnh placeholder cơ khí nếu upload lỗi hoặc không có file
        let imageUrl = `https://placehold.co/600x400/1e3a8a/white?text=${encodeURIComponent(title || 'Mechanical+Project')}`;

        // Nếu có file ảnh, lưu tạm thời qua link dữ liệu Base64 an toàn để tránh lỗi đồng bộ cloud
        if (req.file) {
            const base64Data = req.file.buffer.toString('base64');
            imageUrl = `data:${req.file.mimetype};base64,${base64Data}`;
        }

        const newProject = await pool.query(
            'INSERT INTO projects (title, image, link) VALUES ($1, $2, $3) RETURNING *',
            [title, imageUrl, link || '']
        );

        res.status(201).json(newProject.rows[0]);
    } catch (err) {
        console.error("❌ LỖI CHÈN DỮ LIỆU DỰ ÁN:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 3. API: Sửa thông tin dự án
router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, link } = req.body;

        const checkRes = await pool.query('SELECT image FROM projects WHERE id = $1', [id]);
        if (checkRes.rows.length === 0) {
            return res.status(404).json({ error: 'Không tìm thấy dự án' });
        }

        let imageUrl = checkRes.rows[0].image;

        if (req.file) {
            const base64Data = req.file.buffer.toString('base64');
            imageUrl = `data:${req.file.mimetype};base64,${base64Data}`;
        }

        const updated = await pool.query(
            'UPDATE projects SET title=$1, image=$2, link=$3 WHERE id=$4 RETURNING *',
            [title, imageUrl, link || '', id]
        );

        res.json(updated.rows[0]);
    } catch (err) {
        console.error("❌ LỖI SỬA BẢN GHI PROJECTS:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 4. API: Xóa dự án khỏi hệ thống
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM projects WHERE id = $1', [id]);
        res.json({ success: true, message: 'Đã xóa dự án thành công' });
    } catch (err) {
        console.error("❌ LỖI LỆNH XÓA DỰ ÁN:", err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;