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

// =========================================================
// API DÀNH CHO YÊU CẦU GIA CÔNG TỪ USER
// =========================================================

// 1. API Hứng dữ liệu từ Zalo Mini App của User
app.post('/api/machining-request', async (req, res) => {
    try {
        const { id, date, services, material, fileName, phone, email } = req.body;

        const servicesJson = JSON.stringify(services);

        const query = `
            INSERT INTO machining_requests (order_id, created_at, services, material, file_name, phone, email, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;

        await pool.query(query, [id, date, servicesJson, material, fileName, phone, email, 'Chờ xử lý']);

        res.status(200).json({ success: true, message: "Đã lưu yêu cầu thành công!" });
    } catch (error) {
        console.error("Lỗi lưu yêu cầu gia công:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. API Trả dữ liệu cho trang Admin quản lý
app.get('/api/machining-history', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM machining_requests ORDER BY id DESC');

        const formattedData = result.rows.map(item => ({
            id: item.order_id,
            date: item.created_at,
            services: typeof item.services === 'string' ? JSON.parse(item.services) : item.services,
            material: item.material,
            fileName: item.file_name,
            phone: item.phone,
            email: item.email,
            status: item.status
        }));

        res.status(200).json(formattedData);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================

// Đã bổ sung app.listen để server chạy không bị sập
app.listen(PORT, () => {
    console.log("🚀 Server đầu não đang chạy tại cổng: " + PORT);
});