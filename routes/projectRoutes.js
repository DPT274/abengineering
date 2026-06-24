const express = require('express');
const multer = require('multer');
const path = require('path');
const pool = require('./database');

const router = express.Router();

const SUPABASE_URL = "https://btuyyddawdvqlviiyxyj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0dXl5ZGRhd2R2cWx2aWl5eHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNjI3MTYsImV4cCI6MjA5NjgzODcxNn0.pO5PzQN7iIkUPDSzaB0zs-BbO5dtpDvdYS5fyKhIkOo";

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 1. Lấy danh sách dự án từ bảng projects
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM projects ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error("❌ LỖI HỆ THỐNG GET PROJECTS:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 2. Thêm mới dự án (Kiểm tra kỹ bucket mang tên 'projects')
router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { title, link } = req.body;
        if (!req.file) {
            return res.status(400).json({ error: 'Vui lòng chọn hình ảnh dự án!' });
        }

        const filename = `project-${Date.now()}${path.extname(req.file.originalname)}`;

        // Đẩy ảnh lên Supabase Cloud - Chú ý tên bucket 'projects'
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('projects')
            .upload(filename, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: true
            });

        if (uploadError) {
            console.error("❌ LỖI UPLOAD ẢNH LÊN SUPABASE:", uploadError.message);
            return res.status(500).json({ error: `Lỗi Supabase Storage: ${uploadError.message}` });
        }

        const imageUrl = supabase.storage.from('projects').getPublicUrl(filename).data.publicUrl;

        const newProject = await pool.query(
            'INSERT INTO projects (title, image, link) VALUES ($1, $2, $3) RETURNING *',
            [title, imageUrl, link || '']
        );

        res.status(201).json(newProject.rows[0]);
    } catch (err) {
        console.error("❌ LỖI LOGIC POST PROJECT:", err.message);
        res.status(500).json({ error: err.message });
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
            const { error: updateError } = await supabase.storage.from('projects').upload(filename, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: true
            });

            if (updateError) throw updateError;
            imageUrl = supabase.storage.from('projects').getPublicUrl(filename).data.publicUrl;
        }

        const updated = await pool.query(
            'UPDATE projects SET title=$1, image=$2, link=$3 WHERE id=$4 RETURNING *',
            [title, imageUrl, link || '', id]
        );

        res.json(updated.rows[0]);
    } catch (err) {
        console.error("❌ LỖI NỘI BỘ PUT PROJECT:", err.message);
        res.status(500).json({ error: err.message });
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
        console.error("❌ LỖI NỘI BỘ DELETE PROJECT:", err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;