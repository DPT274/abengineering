const express = require('express');
const path = require('path');
const cors = require('cors');
const bannerRoutes = require('./routes/bannerRoutes');
const jobRoutes = require('./routes/jobRoutes');
const pool = require('./routes/database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Điều hướng API chính
app.use('/api/banners', bannerRoutes);

// Route kiểm tra nhanh tình trạng online trên trình duyệt
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