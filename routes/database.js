const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres.btuyyddawdvqlviiyxyj',
    // ✅ ĐÃ SỬA: Bỏ đoạn chuỗi trùng lặp, chỉ giữ lại 1 cụm duy nhất
    host: 'aws-1-ap-southeast-1.pooler.supabase.com',
    database: 'postgres',
    password: 'PhuocTai2026@',
    port: 5432,
});

module.exports = pool;