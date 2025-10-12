const express = require('express')
const Service = require('./Service')
const app = express()

const ProductImageModel = require('../models/ProductImageModel');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// สร้าง uploads directory ถ้ายังไม่มี
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// ตั้งค่า multer สำหรับเก็บไฟล์ใน local
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // สร้างชื่อไฟล์ที่ไม่ซ้ำกัน
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname); // นามสกุลไฟล์
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// ตั้งค่า multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: function (req, file, cb) {
        // ตรวจสอบประเภทไฟล์
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น (jpeg, jpg, png, gif, webp)'));
        }
    }
});


app.post('/productImage/insert/', Service.isLogin, upload.single('productImage'), async (req, res) => {
    try {        
        // ตรวจสอบว่ามีไฟล์หรือไม่
        if (!req.file) {
            return res.status(400).json({ message: 'กรุณาเลือกรูปภาพ' });
        }

        // สร้าง URL สำหรับเข้าถึงรูปภาพ
        const imageUrl = `/uploads/${req.file.filename}`;

        // บันทึกข้อมูลรูปภาพลงฐานข้อมูล
        await ProductImageModel.create({
            isMain: false,
            imageName: req.file.filename, // ชื่อไฟล์ใน local
            imageUrl: imageUrl, // URL สำหรับเข้าถึงรูปภาพ
            productId: req.body.productId
        });

        res.send({ 
            message: 'success',
            imageUrl: imageUrl,
            filename: req.file.filename
        });
    } catch (e) {
        res.statusCode = 500;
        res.send({message: e.message});
    }
})

app.get('/productImage/list/:productId/', Service.isLogin, async (req, res) => {
    try {
        const results = await ProductImageModel.findAll({
            where: {
                productId: req.params.productId
            },
            order: [['id', 'DESC']]
        })
        
        results.forEach(img => {
           
        });
        
        res.send({message: 'success', results: results});
    } catch (e) {
        console.error('List images error:', e);
        res.statusCode = 500;
        res.send({message: e.message});
    }
})
app.delete('/productImage/delete/:id/', Service.isLogin, async (req, res) => {
    try {
        const row = await ProductImageModel.findByPk(req.params.id);
        if (!row) {
            return res.status(404).json({ message: 'ไม่พบรูปภาพ' });
        }

        const imageName = row.imageName; // ชื่อไฟล์ใน local
        const imagePath = path.join(uploadDir, imageName);

        // ลบข้อมูลจากฐานข้อมูล
        await ProductImageModel.destroy({
            where: {
                id: req.params.id
            }
        });

        // ลบรูปภาพจาก local storage
        try {
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        } catch (fileError) {
            console.error('Error deleting file:', fileError);
            // ไม่ return error เพราะข้อมูลในฐานข้อมูลถูกลบแล้ว
        }

        res.send({message: 'success'});
    } catch (e) {
        res.statusCode = 500;
        res.send({message: e.message});
    }
})
app.get('/productImage/chooseMainImage/:id/:productId/', Service.isLogin, async (req, res) => {
    try {
        await ProductImageModel.update({
            isMain: false
        }, {
            where: {
                productId: req.params.productId
            }
        })

        await ProductImageModel.update({
            isMain: true
        }, {
            where: {
                id: req.params.id
            }
        })

        res.send({message: 'success'});
    } catch (e) {
        res.statusCode = 500;
        res.send({message: e.message});
    }
})

// Endpoint สำหรับทดสอบดูข้อมูลรูปภาพทั้งหมด
app.get('/productImage/debug/all/', Service.isLogin, async (req, res) => {
    try {
        const results = await ProductImageModel.findAll({
            order: [['id', 'DESC']],
            limit: 10
        })
        
        results.forEach(img => {
           
        });
        
        res.send({
            message: 'success', 
            results: results,
            summary: {
                total: results.length,
                withImageUrl: results.filter(img => img.imageUrl).length,
                withoutImageUrl: results.filter(img => !img.imageUrl).length
            }
        });
    } catch (e) {
        console.error('Debug all images error:', e);
        res.statusCode = 500;
        res.send({message: e.message});
    }
})

module.exports = app;
