const express = require('express');
const multer = require('multer');
const path = require('path');
const pool = require('./database');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// Cấu hình kết nối Supabase Cloud
const SUPABASE_URL = "https://btuyyddawdvqlviiyxyj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0dXl5ZGRhd2R2cWx2aWl5eHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNjI3MTYsImV4cCI6MjA5NjgzODcxNn0.pO5PzQN7iIkUPDSzaB0zs-BbO5dtpDvdYS5fyKhIkOo";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 1. Lấy danh sách dự án từ bảng projects
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM projects ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error("Lỗi GET projects:", err);
        res.status(500).json({ error: 'Lỗi lấy danh sách dự án' });
    }
});

// 2. Thêm mới dự án vào bảng projects (Upload ảnh lên bucket 'projects')
router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { title, link } = req.body;
        if (!req.file) {
            return res.status(400).json({ error: 'Vui lòng chọn hình ảnh dự án!' });
        }

        const filename = `project-${Date.now()}${path.extname(req.file.originalname)}`;

        const { error } = await supabase.storage
            .from('projects')
            .upload(filename, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: true
            });

        if (error) throw error;

        const imageUrl = supabase.storage.from('projects').getPublicUrl(filename).data.publicUrl;

        const newProject = await pool.query(
            'INSERT INTO projects (title, image, link) VALUES ($1, $2, $3) RETURNING *',
            [title, imageUrl, link || '']
        );

        res.status(201).json(newProject.rows[0]);
    } catch (err) {
        console.error("Lỗi POST project:", err);
        res.status(500).json({ error: 'Lỗi khi thêm dự án mới' });
    }
});

// 3. Sửa thông tin dự án
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
            if (imageUrl) {
                const oldFilename = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);
                await supabase.storage.from('projects').remove([oldFilename]);
            }

            const filename = `project-${Date.now()}${path.extname(req.file.originalname)}`;
            await supabase.storage.from('projects').upload(filename, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: true
            });
            imageUrl = supabase.storage.from('projects').getPublicUrl(filename).data.publicUrl;
        }

        const updated = await pool.query(
            'UPDATE projects SET title=$1, image=$2, link=$3 WHERE id=$4 RETURNING *',
            [title, imageUrl, link || '', id]
        );

        res.json(updated.rows[0]);
    } catch (err) {
        console.error("Lỗi PUT project:", err);
        res.status(500).json({ error: 'Lỗi cập nhật dự án' });
    }
});

// 4. Xóa dự án hoàn toàn
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const checkRes = await pool.query('SELECT image FROM projects WHERE id = $1', [id]);

        if (checkRes.rows.length > 0) {
            const imageUrl = checkRes.rows[0].image;
            if (imageUrl) {
                const filename = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);
                await supabase.storage.from('projects').remove([filename]);
            }

            await pool.query('DELETE FROM projects WHERE id = $1', [id]);
            return res.json({ success: true, message: 'Đã xóa dự án thành công' });
        }
        res.status(404).json({ error: 'Không tìm thấy dữ liệu' });
    } catch (err) {
        console.error("Lỗi DELETE project:", err);
        res.status(500).json({ error: 'Lỗi xóa dự án' });
    }
});

module.exports = router;