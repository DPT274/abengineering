const express = require('express');
const multer = require('multer');
const path = require('path');
const pool = require('./database');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const SUPABASE_URL = "https://btuyyddawdvqlviiyxyj.supabase.co";
// ⚠️ DÁN MÃ KEY KHỞI TẠO CỦA BẠN VÀO ĐÂY:
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0dXl5ZGRhd2R2cWx2aWl5eHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNjI3MTYsImV4cCI6MjA5NjgzODcxNn0.pO5PzQN7iIkUPDSzaB0zs-BbO5dtpDvdYS5fyKhIkOo";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 1. API cho Client User: Lấy danh sách ảnh active
router.get('/', async (req, res) => {
    try {
        const bannersRes = await pool.query('SELECT image_url FROM banners WHERE is_active = true ORDER BY id DESC');
        const durationRes = await pool.query("SELECT value FROM settings WHERE key = 'banner_duration'");

        const imagesArray = bannersRes.rows.map(row => row.image_url);
        const durationValue = durationRes.rows.length > 0 ? parseInt(durationRes.rows[0].value) : 3000;

        res.json({ images: imagesArray, duration: durationValue });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi hệ thống khi lấy banner' });
    }
});

// 2. API cho Web Admin: Lấy thông tin chi tiết quản lý
router.get('/admin', async (req, res) => {
    try {
        const bannersRes = await pool.query('SELECT * FROM banners ORDER BY id DESC');
        const durationRes = await pool.query("SELECT value FROM settings WHERE key = 'banner_duration'");
        const durationValue = durationRes.rows.length > 0 ? parseInt(durationRes.rows[0].value) : 3000;

        res.json({ banners: bannersRes.rows, duration: durationValue });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi hệ thống admin' });
    }
});

// 3. API cho Web Admin: Đăng ảnh mới lên Cloud Storage
router.post('/', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Vui lòng cung cấp file ảnh' });

        const filename = `banner-${Date.now()}${path.extname(req.file.originalname)}`;

        const { data, error } = await supabase.storage
            .from('banners')
            .upload(filename, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: true
            });

        if (error) throw error;

        const { data: urlData } = supabase.storage.from('banners').getPublicUrl(filename);
        const absoluteImageUrl = urlData.publicUrl;

        const newBanner = await pool.query(
            'INSERT INTO banners (image_url, is_active) VALUES ($1, $2) RETURNING *',
            [absoluteImageUrl, true]
        );
        res.status(201).json(newBanner.rows[0]);
    } catch (err) {
        console.error("Lỗi upload Supabase Storage:", err);
        res.status(500).json({ error: 'Lỗi khi tải banner lên' });
    }
});

// 4. API cập nhật tốc độ lướt
router.post('/duration', async (req, res) => {
    try {
        const { duration } = req.body;
        await pool.query("INSERT INTO settings (key, value) ON CONFLICT (key) DO UPDATE SET value = $1", [duration.toString()]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Lỗi thời gian' }); }
});

// 5. API Bật/Tắt
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        await pool.query('UPDATE banners SET is_active = $1 WHERE id = $2', [is_active, id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Lỗi trạng thái' }); }
});

// 6. API Xóa banner
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const checkRes = await pool.query('SELECT image_url FROM banners WHERE id = $1', [id]);

        if (checkRes.rows.length > 0) {
            const imageUrl = checkRes.rows[0].image_url;
            const filename = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);

            await supabase.storage.from('banners').remove([filename]);
            await pool.query('DELETE FROM banners WHERE id = $1', [id]);
            return res.json({ success: true, message: 'Đã xóa banner vĩnh viễn' });
        }
        res.status(404).json({ error: 'Không tìm thấy dữ liệu' });
    } catch (err) { res.status(500).json({ error: 'Lỗi xóa dữ liệu' }); }
});

module.exports = router;