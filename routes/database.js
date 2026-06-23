const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres.btuyyddawdvqlviiyxyj',
    host: 'aws-1-ap-southeast-1.pooler.southeast-1.pooler.supabase.com', // Cấu hình Pool có sẵn từ lúc đầu của Tài
    database: 'postgres',
    password: 'PhuocTai2026@',
    port: 5432,
});

module.exports = pool;