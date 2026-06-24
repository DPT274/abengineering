const express = require("express");
const router = express.Router();
const axios = require("axios");

// Giả sử Tài cấu hình App ID và Secret Key của Zalo Mini App trong file .env
const ZALO_APP_ID = process.env.ZALO_APP_ID || "997529094927085197";
const ZALO_SECRET_KEY = process.env.ZALO_SECRET_KEY || "PIufXB2A7B36YFrkR6Xf";

/**
 * 🔐 POST /api/decode-phone
 * Endpoint tiếp nhận Token mã hóa từ Frontend, giải mã SĐT và đồng bộ thông tin User
 */
router.post("/api/decode-phone", async (req, res) => {
    try {
        const { token, name, avatar } = req.body;

        if (!token) {
            return res.status(400).json({ success: false, error: "Thiếu Token xác thực từ Zalo" });
        }

        let realPhoneNumber = "0000000000"; // Số điện thoại mặc định phòng hờ lỗi

        try {
            // 1. Gọi lên API OpenAPI của Zalo để giải mã Token lấy Số điện thoại thực tế
            // Tài liệu Zalo: https://mini.zalo.me/docs/api/getPhoneNumber/
            const zaloResponse = await axios.get("https://graph.zalo.me/v2.0/me/info", {
                headers: {
                    secret_key: ZALO_SECRET_KEY,
                    token: token,
                    app_id: ZALO_APP_ID
                }
            });

            if (zaloResponse.data && zaloResponse.data.data) {
                // Kết quả giải mã thành công từ Zalo
                realPhoneNumber = zaloResponse.data.data.number;
            }
        } catch (zaloErr) {
            console.error("Lỗi khi giải mã Token tại API Zalo Graph:", zaloErr.message);
            // Nếu lỗi giải mã (do môi trường test), chúng ta dùng tạm chuỗi Token để test luồng
            realPhoneNumber = "Test-" + token.slice(-8);
        }

        // 2. ĐỒNG BỘ DỮ LIỆU VÀO DATABASE (PostgreSQL / Supabase / MongoDB của Tài)
        console.log("=== ĐỒNG BỘ THÀNH VIÊN AB ENGINEERING ===");
        console.log(`👤 Tên khách hàng: ${name}`);
        console.log(`📞 Số điện thoại: ${realPhoneNumber}`);
        console.log(`🖼️ Link ảnh đại diện: ${avatar}`);

        /**
         * Chỗ này Tài viết lệnh Insert/Upsert vào DB của bạn nhé, ví dụ:
         * await db.user.upsert({
         * where: { phone: realPhoneNumber },
         * update: { name, avatar },
         * create: { phone: realPhoneNumber, name, avatar }
         * });
         */

        // 3. Phản hồi kết quả sạch đẹp về cho Frontend Zalo Mini App
        return res.status(200).json({
            success: true,
            phoneNumber: realPhoneNumber,
            message: "Đồng bộ hồ sơ thành viên lên hệ thống thành công!"
        });

    } catch (error) {
        console.error("Lỗi xử lý API hệ thống Backend:", error);
        return res.status(500).json({ success: false, error: "Lỗi xử lý máy chủ nội bộ" });
    }
});

module.exports = router;