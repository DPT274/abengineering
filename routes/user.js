const express = require('express');
const router = express.Router();
const axios = require('axios');

// 🔐 API GIẢI MÃ SĐT & LẤY THÔNG TIN THẬT TỪ ZALO
router.post('/api/decode-phone', async (req, res) => {
    const { access_token, token } = req.body;

    // Khóa bí mật App của Tài (Nên đưa vào file .env)
    const secret_key = 'YquZWgAUrU636nDJJcx2';

    if (!access_token || !token) {
        return res.status(400).json({ success: false, message: "Thiếu mã xác thực từ Zalo" });
    }

    try {
        // Gọi thẳng vào tim của Zalo Graph API
        const response = await axios.get('https://graph.zalo.me/v2.0/me/info', {
            headers: {
                'access_token': access_token,
                'code': token,
                'secret_key': secret_key
            }
        });

        // Zalo trả về hàng thật
        if (response.data && response.data.data) {
            let phone = response.data.data.number || "";
            let name = response.data.data.name || "";
            let avatar = response.data.data.picture || "";

            // Xử lý đầu số 84 -> 0
            if (phone.startsWith('84')) {
                phone = '0' + phone.slice(2);
            }

            // (Tài có thể viết lệnh INSERT DB ở đây)

            res.json({
                success: true,
                phone: phone,
                name: name,
                avatar: avatar
            });
        } else {
            res.status(400).json({ success: false, message: "Zalo từ chối giải mã (Lỗi App chưa kích hoạt hoặc sai Key)" });
        }
    } catch (error) {
        console.error("Lỗi gọi API Zalo:", error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, error: "Lỗi kết nối máy chủ Zalo Graph" });
    }
});

module.exports = router;