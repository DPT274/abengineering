const express = require('express');
const multer = require('multer');
const path = require('path');
const pool = require('./database');

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 1. API: Lấy danh sách dự án
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM projects ORDER BY id DESC');
        res.json(result.rows || []);
    } catch (err) {
        console.error("Lỗi GET projects:", err.message);
        res.json([]);
    }
});

// 2. API: Thêm mới dự án kèm nội dung bài viết
router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { title, link, content } = req.body;

        let imageUrl = `https://placehold.co/600x400/1e3a8a/white?text=${encodeURIComponent(title || 'Project')}`;
        if (req.file) {
            const base64Data = req.file.buffer.toString('base64');
            imageUrl = `data:${req.file.mimetype};base64,${base64Data}`;
        }

        const newProject = await pool.query(
            'INSERT INTO projects (title, image, link, content) VALUES ($1, $2, $3, $4) RETURNING *',
            [title, imageUrl, link || '', content || '']
        );

        res.status(201).json(newProject.rows[0]);
    } catch (err) {
        console.error("Lỗi POST project:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 3. API: Sửa thông tin dự án
router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, link, content } = req.body;

        const checkRes = await pool.query('SELECT image FROM projects WHERE id = $1', [id]);
        if (checkRes.rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy dự án' });

        let imageUrl = checkRes.rows[0].image;
        if (req.file) {
            const base64Data = req.file.buffer.toString('base64');
            imageUrl = `data:${req.file.mimetype};base64,${base64Data}`;
        }

        const updated = await pool.query(
            'UPDATE projects SET title=$1, image=$2, link=$3, content=$4 WHERE id=$5 RETURNING *',
            [title, imageUrl, link || '', content || '', id]
        );

        res.json(updated.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. API: Xóa dự án
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM projects WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;