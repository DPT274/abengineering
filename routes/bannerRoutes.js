const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('./database'); // Gọi database.js cùng cấp thư mục

const router = express.Router();
const DOMAIN_VPS = ""; // Điền domain của bạn khi deploy

// Cấu hình Multer lưu ảnh vào đúng thư mục public/uploads từ vị trí file routes/
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../public/uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'banner-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// 1. API cho Client User: Lấy danh sách ảnh active + duration
router.get('/', async (req, res) => {
    try {
        const bannersRes = await pool.query('SELECT image_url FROM banners WHERE is_active = true ORDER BY id DESC');
        const durationRes = await pool.query("SELECT value FROM settings WHERE key = 'banner_duration'");

        const imagesArray = bannersRes.rows.map(row => row.image_url);
        const durationValue = durationRes.rows.length > 0 ? parseInt(durationRes.rows[0].value) : 3000;

        res.json({ images: imagesArray, duration: durationValue });
    } catch (err) {
        console.error("Lỗi GET client banners:", err);
        res.status(500).json({ error: 'Lỗi server khi lấy banner' });
    }
});

// 2. API cho Web Admin: Lấy thông tin quản lý chi tiết
router.get('/admin', async (req, res) => {
    try {
        const bannersRes = await pool.query('SELECT * FROM banners ORDER BY id DESC');
        const durationRes = await pool.query("SELECT value FROM settings WHERE key = 'banner_duration'");
        const durationValue = durationRes.rows.length > 0 ? parseInt(durationRes.rows[0].value) : 3000;

        res.json({ banners: bannersRes.rows, duration: durationValue });
    } catch (err) {
        console.error("Lỗi GET admin banners:", err);
        res.status(500).json({ error: 'Lỗi server khi lấy dữ liệu admin' });
    }
});

// 3. API cho Web Admin: Đăng banner mới
router.post('/', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Vui lòng cung cấp file ảnh' });
        const absoluteImageUrl = `${DOMAIN_VPS}/uploads/${req.file.filename}`;

        const newBanner = await pool.query(
            'INSERT INTO banners (image_url, is_active) VALUES ($1, $2) RETURNING *',
            [absoluteImageUrl, true]
        );
        res.status(201).json(newBanner.rows[0]);
    } catch (err) {
        console.error("Lỗi POST banner:", err);
        res.status(500).json({ error: 'Lỗi khi upload banner' });
    }
});

// 4. API cho Web Admin: Cập nhật tốc độ lướt ảnh
router.post('/duration', async (req, res) => {
    try {
        const { duration } = req.body;
        await pool.query(
            "INSERT INTO settings (key, value) ON CONFLICT (key) DO UPDATE SET value = $1",
            [duration.toString()]
        );
        res.json({ success: true, message: 'Lưu cấu hình thời gian thành công' });
    } catch (err) {
        console.error("Lỗi POST duration:", err);
        res.status(500).json({ error: 'Lỗi cập nhật cấu hình thời gian' });
    }
});

// 5. API cho Web Admin: Bật/Tắt Trạng thái hoạt động
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        await pool.query('UPDATE banners SET is_active = $1 WHERE id = $2', [is_active, id]);
        res.json({ success: true });
    } catch (err) {
        console.error("Lỗi PUT banner active:", err);
        res.status(500).json({ error: 'Lỗi cập nhật trạng thái hoạt động' });
    }
});

// 6. API cho Web Admin: Xóa banner cứng trên VPS
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const checkRes = await pool.query('SELECT image_url FROM banners WHERE id = $1', [id]);

        if (checkRes.rows.length > 0) {
            const imageUrl = checkRes.rows[0].image_url;
            const filename = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);
            const targetFilePath = path.join(__dirname, '../public/uploads', filename);

            if (fs.existsSync(targetFilePath)) fs.unlinkSync(targetFilePath);

            await pool.query('DELETE FROM banners WHERE id = $1', [id]);
            return res.json({ success: true, message: 'Đã xóa banner vĩnh viễn' });
        }
        res.status(404).json({ error: 'Không tìm thấy dữ liệu banner' });
    } catch (err) {
        console.error("Lỗi DELETE banner:", err);
        res.status(500).json({ error: 'Lỗi trong quá trình xóa dữ liệu' });
    }
});

module.exports = router;