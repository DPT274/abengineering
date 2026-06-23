const express = require('express');
const path = require('path');
const cors = require('cors');
const bannerRoutes = require('./routes/bannerRoutes'); // Gọi chính xác thư mục routes ngang hàng
const pool = require('./routes/database');            // Gọi để test kết nối trực tiếp

const app = express();
const PORT = process.env.PORT || 5000;

// Các Middleware cơ bản
app.use(cors());
app.use(express.json());

// Phục vụ thư mục static chứa ảnh công khai
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Nhúng module quản lý banner vào đường dẫn chung /api/banners
app.use('/api/banners', bannerRoutes);

// Kích hoạt ping test kiểm tra thông tin tài khoản Supabase ngay lập tức
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('\n❌ Kết nối Supabase THẤT BẠI rồi Tài ơi! Kiểm tra lại mật khẩu:', err.message);
    } else {
        console.log('\n✅ KẾT NỐI SUPABASE THÀNH CÔNG RỰC RỠ! Thời gian hệ thống AWS:', res.rows[0].now);
    }
});

app.listen(PORT, () => {
    console.log(`\n🚀 Server AB Engineering đang chạy tại: http://localhost:${PORT}`);
    console.log(`🔗 Link test API Banners: http://localhost:${PORT}/api/banners`);
});