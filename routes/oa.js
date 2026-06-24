const express = require('express');
const router = express.Router();

// Mảng chứa các khối liên kết (Action Cards) do Admin tạo
let globalActionCards = [];

// 🟢 GET: Lấy danh sách khối liên kết hiển thị ra trang chủ
router.get("/api/settings/action-cards", (req, res) => {
    return res.status(200).json({ success: true, data: globalActionCards });
});

// 🔴 POST: Admin lưu danh sách mới (Thêm, xóa, sửa)
router.post("/api/settings/action-cards", (req, res) => {
    try {
        // Nhận mảng từ Admin và lưu lại
        globalActionCards = Array.isArray(req.body.cards) ? req.body.cards : [];
        return res.status(200).json({ success: true, message: "Đã lưu cấu hình Khối liên kết!" });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Lỗi hệ thống" });
    }
});

module.exports = router;