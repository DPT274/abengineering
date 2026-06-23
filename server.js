const express = require('express');
const path = require('path');
const cors = require('cors');
const bannerRoutes = require('./routes/bannerRoutes');
const jobRoutes = require('./routes/jobRoutes');
const hotlineRoutes = require('./routes/hotlineRoutes');
const pool = require('./routes/database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// KHAI BÁO CÁC TUYẾN ĐƯỜNG API ĐIỀU HƯỚNG CHÍNH THỨC
app.use('/api/banners', bannerRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/hotlines', hotlineRoutes);

// ✅ ĐÃ THÊM: MOCK TẠM API SẢN PHẨM NỔI BẬT ĐỂ FIX LỖI 404 TRANG CHỦ ZALO
app.get('/api/connections', (req, res) => {
    res.json([
        {
            id: 1,
            title: "Gia công đồ gá chính xác",
            image: "https://placehold.co/600x400/1e3a8a/white?text=Do+Ga+CNC",
            link: ""
        },
        {
            id: 2,
            title: "Thiết kế khuôn mẫu",
            image: "https://placehold.co/600x400/dc2626/white?text=Khuon+Mau",
            link: ""
        }
    ]);
});

// MOCK TẠM ENDPOINT UTILITIES ĐỂ TRÁNH LỖI FRONTEND (NẾU CÓ)
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