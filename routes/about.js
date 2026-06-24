const express = require('express');
const router = express.Router();

// 1. Khối lưu trữ dữ liệu Hồ sơ năng lực (About)
let globalAboutData = {
    companyName: "", slogan: "", bannerImg: "", aboutText: "", statsImg: "", visionText: "", missionText: "",
    core1Title: "", core1Desc: "", core2Title: "", core2Desc: "", core3Title: "", core3Desc: "", core4Title: "", core4Desc: "",
    stat1Num: "", stat1Text: "", stat2Num: "", stat2Text: "", stat3Num: "", stat3Text: "", stat4Num: "", stat4Text: "",
    field1Title: "", field1Desc: "", field2Title: "", field2Desc: "", field3Title: "", field3Desc: "", field4Title: "", field4Desc: "", field5Title: "", field5Desc: ""
};

// 2. Biến lưu trữ đường link Zalo OA động
let globalZaloOALink = "";

// ==========================================
// 📖 CÁC API CHO MỤC GIỚI THIỆU (ABOUT)
// ==========================================
router.get("/api/settings/about", (req, res) => {
    return res.status(200).json({ success: true, data: globalAboutData });
});

router.post("/api/settings/about", (req, res) => {
    try {
        const d = req.body;
        globalAboutData = {
            companyName: d.companyName || "", slogan: d.slogan || "", bannerImg: d.bannerImg || "", aboutText: d.aboutText || "", statsImg: d.statsImg || "", visionText: d.visionText || "", missionText: d.missionText || "",
            core1Title: d.core1Title || "", core1Desc: d.core1Desc || "", core2Title: d.core2Title || "", core2Desc: d.core2Desc || "", core3Title: d.core3Title || "", core3Desc: d.core3Desc || "", core4Title: d.core4Title || "", core4Desc: d.core4Desc || "",
            stat1Num: d.stat1Num || "", stat1Text: d.stat1Text || "", stat2Num: d.stat2Num || "", stat2Text: d.stat2Text || "", stat3Num: d.stat3Num || "", stat3Text: d.stat3Text || "", stat4Num: d.stat4Num || "", stat4Text: d.stat4Text || "",
            field1Title: d.field1Title || "", field1Desc: d.field1Desc || "", field2Title: d.field2Title || "", field2Desc: d.field2Desc || "", field3Title: d.field3Title || "", field3Desc: d.field3Desc || "", field4Title: d.field4Title || "", field4Desc: d.field4Desc || "", field5Title: d.field5Title || "", field5Desc: d.field5Desc || ""
        };
        return res.status(200).json({ success: true, message: "Đồng bộ hệ thống dữ liệu thành công!" });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Lỗi ghi dữ liệu" });
    }
});

// ==========================================
// ⚙️ CÁC API CHO CẤU HÌNH ZALO OA (MỚI THÊM)
// ==========================================

// 🟢 GET: Lấy link Zalo OA hiện tại về cho Admin và trang chủ hiển thị
router.get("/api/settings/zalo-oa", (req, res) => {
    return res.status(200).json({
        success: true,
        link: globalZaloOALink // Trả trực tiếp trường link ra ngoài đúng cấu pháp frontend cần fetch
    });
});

// 🔴 POST: Nhận link Zalo OA mới do Admin dán vào form và lưu lại
router.post("/api/settings/zalo-oa", (req, res) => {
    try {
        const { link } = req.body;
        globalZaloOALink = link || ""; // Lưu chuỗi link vào bộ nhớ tạm

        return res.status(200).json({
            success: true,
            message: "Cập nhật đường dẫn Zalo OA thành công!"
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Lỗi ghi dữ liệu Zalo OA" });
    }
});

module.exports = router;