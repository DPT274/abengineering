const express = require('express');
const router = express.Router();
const axios = require('axios');
const pool = require('./database'); // Đảm bảo bạn đã import kết nối PostgreSQL của bạn vào đây

router.post('/api/decode-phone', async (req, res) => {
    const { access_token, token } = req.body;

    // Khóa bí mật App của bạn (Bắt buộc lấy từ dev.zalo.me)
    const secret_key = 'PIufXB2A7B36YFrkR6Xf';

    if (!access_token || !token) {
        return res.status(400).json({ success: false, message: "Thiếu mã xác thực từ Zalo" });
    }

    try {
        // 1. Gọi Zalo để lấy hàng thật
        const response = await axios.get('https://graph.zalo.me/v2.0/me/info', {
            headers: {
                'access_token': access_token,
                'code': token,
                'secret_key': secret_key
            }
        });

        if (response.data && response.data.data) {
            let phone = response.data.data.number || "";
            let name = response.data.data.name || response.data.name || "Khách Hàng Kỹ Thuật";
            let avatar = response.data.data.picture || response.data.picture?.data?.url || "";

            if (phone.startsWith('84')) {
                phone = '0' + phone.slice(2);
            }

            // 2. LƯU VÀO CƠ SỞ DỮ LIỆU POSTGRESQL (Supabase)
            try {
                await pool.query(
                    `INSERT INTO customers (phone, name, avatar) 
                     VALUES ($1, $2, $3) 
                     ON CONFLICT (phone) DO UPDATE 
                     SET name = EXCLUDED.name, avatar = EXCLUDED.avatar`,
                    [phone, name, avatar]
                );
                console.log("Đã lưu khách hàng vào Database:", name, phone);
            } catch (dbErr) {
                console.error("Lỗi khi lưu vào Database:", dbErr.message);
                // Dù DB lỗi, vẫn cứ trả thông tin về cho App chạy tiếp
            }

            // 3. Trả kết quả về cho Zalo Mini App hiển thị
            res.json({
                success: true,
                phone: phone,
                name: name,
                avatar: avatar
            });
        } else {
            res.status(400).json({ success: false, message: "Zalo từ chối giải mã!" });
        }
    } catch (error) {
        console.error("Lỗi gọi API Zalo:", error.message);
        res.status(500).json({ success: false, error: "Lỗi kết nối máy chủ Zalo Graph" });
    }
});

module.exports = router;