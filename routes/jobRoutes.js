const express = require('express');
const multer = require('multer');
const path = require('path');
const pool = require('./database');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const SUPABASE_URL = "https://btuyyddawdvqlviiyxyj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0dXl5ZGRhd2R2cWx2aWl5eHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNjI3MTYsImV4cCI6MjA5NjgzODcxNn0.pO5PzQN7iIkUPDSzaB0zs-BbO5dtpDvdYS5fyKhIkOo";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 1. API: Lấy danh sách việc làm công khai
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM jobs ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error("Lỗi GET jobs:", err);
        res.status(500).json({ error: 'Lỗi hệ thống khi lấy danh sách việc làm' });
    }
});

// 2. API: Đăng tin tuyển dụng mới kèm ảnh lên Cloud Storage
router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { title, company, salary, expertise, contact, email, description, requirements, benefits, location, deadline } = req.body;
        let imageUrl = null;

        if (req.file) {
            const filename = `job-${Date.now()}${path.extname(req.file.originalname)}`;
            const { data, error } = await supabase.storage
                .from('jobs')
                .upload(filename, req.file.buffer, {
                    contentType: req.file.mimetype,
                    upsert: true
                });

            if (error) throw error;

            const { data: urlData } = supabase.storage.from('jobs').getPublicUrl(filename);
            imageUrl = urlData.publicUrl;
        }

        const newJob = await pool.query(
            `INSERT INTO jobs (title, company, salary, expertise, contact, email, description, requirements, benefits, location, deadline, image) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
            [title, company, salary, expertise, contact, email, description, requirements, benefits, location, deadline, imageUrl]
        );

        res.status(201).json(newJob.rows[0]);
    } catch (err) {
        console.error("Lỗi POST job:", err);
        res.status(500).json({ error: 'Lỗi khi tạo tin tuyển dụng' });
    }
});

// 3. API: Cập nhật thông tin tuyển dụng
router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, company, salary, expertise, contact, email, description, requirements, benefits, location, deadline } = req.body;

        const checkRes = await pool.query('SELECT image FROM jobs WHERE id = $1', [id]);
        if (checkRes.rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy tin tuyển dụng' });

        let imageUrl = checkRes.rows[0].image;

        if (req.file) {
            if (imageUrl) {
                const oldFilename = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);
                await supabase.storage.from('jobs').remove([oldFilename]);
            }

            const filename = `job-${Date.now()}${path.extname(req.file.originalname)}`;
            const { error } = await supabase.storage
                .from('jobs')
                .upload(filename, req.file.buffer, {
                    contentType: req.file.mimetype,
                    upsert: true
                });

            if (error) throw error;
            imageUrl = supabase.storage.from('jobs').getPublicUrl(filename).data.publicUrl;
        }

        const updatedJob = await pool.query(
            `UPDATE jobs SET title=$1, company=$2, salary=$3, expertise=$4, contact=$5, email=$6, description=$7, requirements=$8, benefits=$9, location=$10, deadline=$11, image=$12
             WHERE id=$13 RETURNING *`,
            [title, company, salary, expertise, contact, email, description, requirements, benefits, location, deadline, imageUrl, id]
        );

        res.json(updatedJob.rows[0]);
    } catch (err) {
        console.error("Lỗi PUT job:", err);
        res.status(500).json({ error: 'Lỗi khi cập nhật dữ liệu' });
    }
});

// 4. API: Xóa tin tuyển dụng
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const checkRes = await pool.query('SELECT image FROM jobs WHERE id = $1', [id]);

        if (checkRes.rows.length > 0) {
            const imageUrl = checkRes.rows[0].image;
            if (imageUrl) {
                const filename = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);
                await supabase.storage.from('jobs').remove([filename]);
            }

            await pool.query('DELETE FROM jobs WHERE id = $1', [id]);
            return res.json({ success: true, message: 'Đã xóa tin tuyển dụng thành công' });
        }
        res.status(404).json({ error: 'Không tìm thấy dữ liệu tuyển dụng' });
    } catch (err) {
        console.error("Lỗi DELETE job:", err);
        res.status(500).json({ error: 'Lỗi xóa tin tuyển dụng' });
    }
});

module.exports = router;