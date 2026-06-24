const express = require('express');
const router = express.Router();

// 1. Khối lưu trữ dữ liệu Hồ sơ năng lực (About)
let globalAboutData = {
    companyName: "", slogan: "", bannerImg: "", aboutText: "", statsImg: "", visionText: "", missionText: "",
    core1Title: "", core1Desc: "", core2Title: "", core2Desc: "", core3Title: "", core3Desc: "", core4Title: "", core4Desc: "",
    stat1Num: "", stat1Text: "", stat2Num: "", stat2Text: "", stat3Num: "", stat3Text: "", stat4Num: "", stat4Text: "",
    field1Title: "", field1Desc: "", field2Title: "", field2Desc: "", field3Title: "", field3Desc: "", field4Title: "", field4Desc: "", field5Title: "", field5Desc: ""
};

// 2. Thay đổi: Dùng mảng động để Admin thêm bao nhiêu OA/Link cũng được
let globalOAList = [];

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
// ⚙️ CÁC API CHO QUẢN LÝ DANH SÁCH OA/LINK
// ==========================================

// 🟢 GET: Lấy danh sách link hiện tại
router.get("/api/settings/zalo-oa", (req, res) => {
    return res.status(200).json({
        success: true,
        data: globalOAList // Trả về mảng dữ liệu
    });
});

// 🔴 POST: Nhận danh sách mảng do Admin đẩy lên
router.post("/api/settings/zalo-oa", (req, res) => {
    try {
        const { list } = req.body;
        // Kiểm tra nếu là mảng thì lưu, không thì gán mảng rỗng
        globalOAList = Array.isArray(list) ? list : [];

        return res.status(200).json({
            success: true,
            message: "Cập nhật danh sách liên kết thành công!"
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Lỗi ghi dữ liệu Liên kết" });
    }
});

module.exports = router;