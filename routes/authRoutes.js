const express = require('express');
const router = express.Router();
const pool = require('./database');

// ==========================================
// 1. API ĐĂNG NHẬP THỦ CÔNG (Dành cho Zalo Mini App)
// ==========================================
router.post('/login', async (req, res) => {
    const { phone, name } = req.body;

    if (!phone || !name) {
        return res.status(400).json({ success: false, message: "Vui lòng nhập đầy đủ Tên và Số điện thoại!" });
    }

    try {
        const formattedPhone = phone.trim();
        const formattedName = name.trim();

        // Kiểm tra xem User đã tồn tại trong DB chưa
        const checkUser = await pool.query('SELECT * FROM customers WHERE phone = $1', [formattedPhone]);

        let user;
        if (checkUser.rows.length > 0) {
            // Đã tồn tại -> Cập nhật lại tên (đề phòng họ đổi tên) và lấy thông tin
            const updatedUser = await pool.query(
                'UPDATE customers SET name = $1 WHERE phone = $2 RETURNING *',
                [formattedName, formattedPhone]
            );
            user = updatedUser.rows[0];
        } else {
            // Chưa tồn tại -> Tạo mới với role mặc định là 'customer'
            const newUser = await pool.query(
                `INSERT INTO customers (phone, name, role) 
                 VALUES ($1, $2, $3) RETURNING *`,
                [formattedPhone, formattedName, 'customer']
            );
            user = newUser.rows[0];
        }

        // Trả data về cho Frontend User
        res.status(200).json({
            success: true,
            message: "Đăng nhập thành công!",
            data: {
                id: user.id,
                phone: user.phone,
                name: user.name,
                role: user.role || 'customer'
            }
        });

    } catch (error) {
        console.error("Lỗi API Đăng nhập:", error);
        res.status(500).json({ success: false, error: "Lỗi máy chủ khi đăng nhập." });
    }
});

// ==========================================
// 2. API LẤY DANH SÁCH USER (Dành cho trang Admin)
// ==========================================
router.get('/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM customers ORDER BY created_at DESC');
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error("Lỗi lấy danh sách User:", error);
        res.status(500).json({ success: false, error: "Lỗi truy xuất dữ liệu hệ thống." });
    }
});

// ==========================================
// 3. API CẬP NHẬT QUYỀN NHÂN VIÊN/KHÁCH HÀNG (Dành cho Admin)
// ==========================================
router.put('/users/:phone/role', async (req, res) => {
    const { phone } = req.params;
    const { role } = req.body; // Chỉ nhận 'customer' hoặc 'employee'

    if (role !== 'customer' && role !== 'employee') {
        return res.status(400).json({ success: false, message: "Nhóm quyền không hợp lệ!" });
    }

    try {
        const result = await pool.query(
            'UPDATE customers SET role = $1 WHERE phone = $2 RETURNING *',
            [role, phone]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy hồ sơ người dùng này." });
        }

        res.status(200).json({
            success: true,
            message: `Đã cấp quyền ${role === 'employee' ? 'Nhân viên' : 'Khách hàng'} thành công!`,
            data: result.rows[0]
        });
    } catch (error) {
        console.error("Lỗi cập nhật quyền:", error);
        res.status(500).json({ success: false, error: "Lỗi hệ thống khi cập nhật quyền." });
    }
});

module.exports = router;