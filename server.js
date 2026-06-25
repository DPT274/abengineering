const express = require('express');
const path = require('path');
const cors = require('cors');
const pool = require('./routes/database');

// Khai báo import tất cả các router chính thức
const bannerRoutes = require('./routes/bannerRoutes');
const jobRoutes = require('./routes/jobRoutes');
const hotlineRoutes = require('./routes/hotlineRoutes');
const connectionRoutes = require('./routes/connectionRoutes');
const newsRoutes = require('./routes/newsRoutes');
const projectRoutes = require('./routes/projectRoutes');
const machiningRoutes = require('./routes/machiningRoutes');
const aboutRouter = require('./routes/about');

// ==========================================
// 🏢 BỔ SUNG: Import router Chi nhánh mới (An toàn luật Zalo)
// ==========================================
const branchRoutes = require('./routes/branchRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// KÍCH HOẠT HỆ THỐNG ĐƯỜNG DẪN API CHÍNH THỨC
app.use('/api/banners', bannerRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/hotlines', hotlineRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', machiningRoutes);
app.use('/', aboutRouter);

// ==========================================
// 🏢 BỔ SUNG: Định tuyến trung gian cho chi nhánh
// Tạo ra đường dẫn chuẩn: BASE_URL + /api + /branches
// ==========================================
app.use('/api', branchRoutes);

// MOCK TẠM ENDPOINT UTILITIES ĐỂ PHỤC VỤ TRANG KHÁC (NẾU CÓ)
app.get('/api/utilities', (req, res) => {
    res.json([]);
});

// Route kiểm tra hệ thống hoạt động
app.get('/', async (req, res) => {
    try {
        const dbTest = await pool.query('SELECT NOW()');
        res.status(200).json({
            status: "ONLINE",
            message: "Hệ thống API tổng thể AB Engineering hoạt động đồng bộ!",
            database: { connected: true, server_time: dbTest.rows[0].now }
        });
    } catch (err) {
        res.status(500).json({ status: "ERROR", error: err.message });
    }
});

// KHỞI ĐỘNG SERVER
app.listen(PORT, () => {
    console.log("🚀 Server đầu não đang chạy tại cổng: " + PORT);
});