const express = require('express');
const path = require('path');
const cors = require('cors');
const axios = require('axios'); // BỔ SUNG: Dùng để gọi API sang Zalo
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
const branchRoutes = require('./routes/branchRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Cấu hình mạng và dữ liệu
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
app.use('/api', branchRoutes);
app.use('/', aboutRouter);

// ==========================================
// 🔐 BỔ SUNG: API GIẢI MÃ SĐT & LẤY THÔNG TIN THẬT TỪ ZALO
// ==========================================
app.post('/api/decode-phone', async (req, res) => {
    const { access_token, token } = req.body;

    // Khóa bí mật App của bạn (Secret Key)
    const secret_key = 'YquZWgAUrU636nDJJcx2';

    if (!access_token || !token) {
        return res.status(400).json({ success: false, message: "Thiếu mã xác thực từ Zalo" });
    }

    try {
        const response = await axios.get('https://graph.zalo.me/v2.0/me/info', {
            headers: {
                'access_token': access_token,
                'code': token,
                'secret_key': secret_key
            }
        });

        if (response.data && response.data.data) {
            let phone = response.data.data.number || "";
            let name = response.data.data.name || "";
            let avatar = response.data.data.picture || "";

            if (phone.startsWith('84')) {
                phone = '0' + phone.slice(2);
            }

            return res.status(200).json({
                success: true,
                phone: phone,
                name: name,
                avatar: avatar
            });
        } else {
            return res.status(400).json({ success: false, message: "Zalo từ chối giải mã (Sai Key hoặc App chưa kích hoạt)" });
        }
    } catch (error) {
        console.error("Lỗi gọi API Zalo:", error.response ? error.response.data : error.message);
        return res.status(500).json({ success: false, error: "Lỗi kết nối máy chủ Zalo Graph" });
    }
});

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