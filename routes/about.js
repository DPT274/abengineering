const express = require('express');
const router = express.Router();

// Khởi tạo Object rỗng hoàn toàn, đợi dữ liệu thật do Admin đẩy từ máy tính lên mới hiển thị
let globalAboutData = {
    companyName: "",
    slogan: "",
    bannerImg: "",
    aboutText: "",
    core1Title: "", core1Desc: "",
    core2Title: "", core2Desc: "",
    core3Title: "", core3Desc: "",
    core4Title: "", core4Desc: "",
    stat1Num: "", stat1Text: "",
    stat2Num: "", stat2Text: "",
    stat3Num: "", stat3Text: "",
    stat4Num: "", stat4Text: "",
    statsImg: "",
    field1Title: "", field1Desc: "",
    field2Title: "", field2Desc: "",
    field3Title: "", field3Desc: "",
    field4Title: "", field4Desc: "",
    field5Title: "", field5Desc: "",
    visionText: "",
    missionText: ""
};

// 🟢 GET /api/settings/about -> Trả dữ liệu thực tế cho Client
router.get("/api/settings/about", (req, res) => {
    return res.status(200).json({
        success: true,
        data: globalAboutData
    });
});

// 🔴 POST /api/settings/about -> Tiếp nhận chuỗi lưu trữ từ Admin
router.post("/api/settings/about", (req, res) => {
    try {
        const d = req.body;
        globalAboutData = {
            companyName: d.companyName || "", slogan: d.slogan || "", bannerImg: d.bannerImg || "",
            aboutText: d.aboutText || "",
            core1Title: d.core1Title || "", core1Desc: d.core1Desc || "",
            core2Title: d.core2Title || "", core2Desc: d.core2Desc || "",
            core3Title: d.core3Title || "", core3Desc: d.core3Desc || "",
            core4Title: d.core4Title || "", core4Desc: d.core4Desc || "",
            stat1Num: d.stat1Num || "", stat1Text: d.stat1Text || "",
            stat2Num: d.stat2Num || "", stat2Text: d.stat2Text || "",
            stat3Num: d.stat3Num || "", stat3Text: d.stat3Text || "",
            stat4Num: d.stat4Num || "", stat4Text: d.stat4Text || "",
            statsImg: d.statsImg || "",
            field1Title: d.field1Title || "", field1Desc: d.field1Desc || "",
            field2Title: d.field2Title || "", field2Desc: d.field2Desc || "",
            field3Title: d.field3Title || "", field3Desc: d.field3Desc || "",
            field4Title: d.field4Title || "", field4Desc: d.field4Desc || "",
            field5Title: d.field5Title || "", field5Desc: d.field5Desc || "",
            visionText: d.visionText || "", missionText: d.missionText || ""
        };
        return res.status(200).json({ success: true, message: "Đồng bộ hệ thống dữ liệu thành công!" });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Lỗi ghi dữ liệu" });
    }
});

module.exports = router;