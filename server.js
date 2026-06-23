const express = require('express');
const path = require('path');
const cors = require('cors');
const bannerRoutes = require('./routes/bannerRoutes');
const jobRoutes = require('./routes/jobRoutes'); // Import module Jobs
const pool = require('./routes/database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Phục vụ thư mục tĩnh public công khai (nếu có dùng lưu file cục bộ)
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// ✅ ĐÃ SỬA: Đăng ký đầy đủ các tuyến đường API phục vụ Frontend
app.use('/api/banners', bannerRoutes);
app.use('/api/jobs', jobRoutes); // Kích hoạt endpoint /api/jobs tránh lỗi 404

// 🛠️ MOCK TẠM ENDPOINT HOTLINE & UTILITIES ĐỂ TRÁNH LỖI ĐỒNG LOẠT TRÊN FRONTEND
app.get('/api/hotlines', (req, res) => {
    res.json([
        { id: 1, name: "Hotline Kỹ Thuật", phone: "0901234567" },
        { id: 2, name: "Phòng Kinh Doanh", phone: "0907654321" }
    ]);
});

app.get('/api/utilities', (req, res) => {
    res.json([
        { id: 1, name: "Tính toán cơ khí", status: "Active" }
    ]);
});

// Route trang chủ kiểm tra tình trạng kết nối hệ thống
app.get('/', async (req, res) => {
    try {
        const dbTest = await pool.query('SELECT NOW()');
        res.status(200).json({
            status: "ONLINE",
            message: "Hệ thống API AB Engineering hoạt động mượt mà!",
            database: {
                connected: true,
                server_time: dbTest.rows[0].now
            }
        });
    } catch (err) {
        res.status(500).json({
            status: "ERROR",
            message: "Không thể thực hiện kết nối cơ sở dữ liệu!",
            error: err.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server đang mở tại cổng: http://localhost:${PORT}`);
});