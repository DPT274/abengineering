const { Pool } = require('pg');
require('dotenv').config();

// Điền trực tiếp thông tin để test, bỏ qua file .env bị kẹt cache
const pool = new Pool({
    user: 'postgres.btuyyddawdvqlviiyxyj',
    host: 'aws-1-ap-southeast-1.pooler.supabase.com',
    database: 'postgres',
    password: 'PhuocTai2026@', // <--- Thay bằng mật khẩu Supabase của anh
    port: 5432,
    // ssl: {
    //     rejectUnauthorized: false
    // }
});

// Kiểm tra kết nối khi khởi động
pool.connect((err, client, release) => {
    if (err) {
        return console.error('❌ Lỗi kết nối CSDL:', err.stack);
    }
    console.log('✅ Đã kết nối thành công với PostgreSQL trên Supabase!');
    release();
});

module.exports = pool;