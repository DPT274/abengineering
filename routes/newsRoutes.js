const express = require('express');
const multer = require('multer');
const path = require('path');
const pool = require('./database');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const SUPABASE_URL = "https://btuyyddawdvqlviiyxyj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0dXl5ZGRhd2R2cWx2aWl5eHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNjI3MTYsImV4cCI6MjA5NjgzODcxNn0.pO5PzQN7iIkUPDSzaB0zs-BbO5dtpDvdYS5fyKhIkOo";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 1. API: Lấy danh sách tin tức
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM news ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error("Lỗi GET news:", err);
        res.status(500).json({ error: 'Lỗi hệ thống khi lấy tin tức' });
    }
});

// 2. API: Đăng tin tức mới
router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { title, content } = req.body;
        let imageUrl = null;

        if (req.file) {
            const filename = `news-${Date.now()}${path.extname(req.file.originalname)}`;
            await supabase.storage.from('news').upload(filename, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
            imageUrl = supabase.storage.from('news').getPublicUrl(filename).data.publicUrl;
        }

        const newNews = await pool.query(
            'INSERT INTO news (title, content, image) VALUES ($1, $2, $3) RETURNING *',
            [title, content, imageUrl]
        );
        res.status(201).json(newNews.rows[0]);
    } catch (err) {
        console.error("Lỗi POST news:", err);
        res.status(500).json({ error: 'Lỗi khi tạo bài viết mới' });
    }
});

// 3. API: Cập nhật tin tức (Sửa bài)
router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content } = req.body;

        const checkRes = await pool.query('SELECT image FROM news WHERE id = $1', [id]);
        if (checkRes.rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy bài viết' });

        let imageUrl = checkRes.rows[0].image;

        if (req.file) {
            if (imageUrl) {
                const oldFilename = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);
                await supabase.storage.from('news').remove([oldFilename]);
            }
            const filename = `news-${Date.now()}${path.extname(req.file.originalname)}`;
            await supabase.storage.from('news').upload(filename, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
            imageUrl = supabase.storage.from('news').getPublicUrl(filename).data.publicUrl;
        }

        const updated = await pool.query(
            'UPDATE news SET title=$1, content=$2, image=$3 WHERE id=$4 RETURNING *',
            [title, content, imageUrl, id]
        );
        res.json(updated.rows[0]);
    } catch (err) {
        console.error("Lỗi PUT news:", err);
        res.status(500).json({ error: 'Lỗi khi cập nhật bài viết' });
    }
});

// 4. API: Xóa bài viết tin tức
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const checkRes = await pool.query('SELECT image FROM news WHERE id = $1', [id]);

        if (checkRes.rows.length > 0) {
            const imageUrl = checkRes.rows[0].image;
            if (imageUrl) {
                const filename = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);
                await supabase.storage.from('news').remove([filename]);
            }
            await pool.query('DELETE FROM news WHERE id = $1', [id]);
            return res.json({ success: true, message: 'Đã xóa bài viết thành công' });
        }
        res.status(404).json({ error: 'Không tìm thấy bài viết' });
    } catch (err) {
        console.error("Lỗi DELETE news:", err);
        res.status(500).json({ error: 'Lỗi xóa bài viết' });
    }
});

module.exports = router;