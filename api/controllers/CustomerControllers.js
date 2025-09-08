require('dotenv').config();

const express = require("express");
const app = express();
app.disable('x-powered-by');
const router = express.Router();
const sequelize = require('sequelize');
const jwt = require("jsonwebtoken");
const service = require("./Service");
const CustomerModel = require("../models/CustomerModel");
const BillSaleModel = require("../models/BillSaleModel");
const BillSaleDetailModel = require("../models/BillSaleDetailModel");
const ProductModel = require("../models/ProductModel");
const PointTransactionModel = require('../models/PointTransactionModel');

// Import associations to ensure they are loaded
require('../models/associations'); 

// เพิ่ม route ดึงข้อมูลลูกค้าทั้งหมด 
router.get("/customers", service.isLogin, async (req, res) => {
    try {
        const userId = service.getAdminId(req);
        if (!userId) {
            return res.status(401).json({ error: "กรุณาเข้าสู่ระบบใหม่" });
        }

        const customers = await CustomerModel.findAll({
            where: { user_id: userId }, // กรองตาม user_id
            order: [['id', 'DESC']]
        });
        
        res.json({ result: customers });
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ error: error.message });
    }
});

// route ดึงข้อมูลลูกค้าตาม ID
router.get("/customer/:id", service.isLogin, async (req, res) => {
    try {
        const userId = service.getAdminId(req);
        if (!userId) {
            return res.status(401).json({ error: "กรุณาเข้าสู่ระบบใหม่" });
        }

        const customer = await CustomerModel.findOne({
            where: { 
                id: req.params.id,
                user_id: userId 
            }
        });

        if (!customer) {
            return res.status(404).json({ error: "ไม่พบข้อมูลลูกค้า" });
        }

        res.json({ result: customer });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// route อัพเดทข้อมูลลูกค้า
router.put("/customer/:id", service.isLogin, async (req, res) => {
    try {
        const customer = await CustomerModel.findByPk(req.params.id);

        if (!customer) {
            return res.status(404).json({ error: "ไม่พบข้อมูลลูกค้า" });
        }

        await CustomerModel.update(req.body, {
            where: { id: req.params.id }
        });

        res.json({ message: "success" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ฟังก์ชันสร้างรหัสลูกค้าอัตโนมัติ
const generateCustomerId = async () => {
    // สร้างรหัสลูกค้า 6 หลัก เริ่มจาก 100001
    const lastCustomer = await CustomerModel.findOne({
        order: [['idcustomers', 'DESC']]
    });
    
    if (lastCustomer && lastCustomer.idcustomers) {
        return lastCustomer.idcustomers + 1;
    } else {
        return 100001; // เริ่มต้นที่ 100001
    }
};

// สร้างลูกค้าใหม่
router.post("/customer", service.isLogin, async (req, res) => {
    try {
        const userId = service.getAdminId(req); // ดึง userId จาก token
        if (!userId) {
            return res.status(400).json({ error: "กรุณาเข้าสู่ระบบใหม่" });
        }

        // ตรวจสอบเบอร์โทรซ้ำ
        const existingCustomer = await CustomerModel.findOne({
            where: { phone: req.body.phone }
        });

        if (existingCustomer) {
            return res.status(400).json({ error: "เบอร์โทรศัพท์นี้มีในระบบแล้ว" });
        }

        // สร้างรหัสลูกค้าใหม่
        const newCustomerId = await generateCustomerId();

        const customerData = {
            ...req.body,
            idcustomers: newCustomerId, // เพิ่มรหัสลูกค้า
            user_id: userId,
            points: 0,
            membershipTier: 'NORMAL',
            pointsExpireDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
        };

        const newCustomer = await CustomerModel.create(customerData);

        res.json({ 
            message: 'success',
            result: newCustomer
        });

    } catch (error) {
        console.error('Create customer error:', error);
        res.status(500).json({ error: error.message });
    }
});

// route สำหรับ login ลูกค้า
router.post("/login/customer", async (req, res) => {
    try {
        const { email, phone, name } = req.body;
        
        if (!email || !phone) {
            return res.status(400).json({ 
                success: false, 
                message: "กรุณากรอกทั้งอีเมลและเบอร์โทรศัพท์" 
            });
        }

        let customer = await CustomerModel.findOne({
            where: { 
                email: email,
                phone: phone
            }
        });

        // ถ้าไม่พบลูกค้า ให้สร้างลูกค้าใหม่
        if (!customer) {
            // สร้างรหัสลูกค้าใหม่
            const newCustomerId = await generateCustomerId();
            
            const customerData = {
                idcustomers: newCustomerId,
                name: name || 'ลูกค้าใหม่', // ใช้ชื่อที่ส่งมาหรือชื่อเริ่มต้น
                email: email,
                phone: phone,
                points: 0,
                membershipTier: 'NORMAL',
                pointsExpireDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
                totalSpent: 0
            };

            customer = await CustomerModel.create(customerData);
        }

        res.json({ 
            success: true,
            message: 'เข้าสู่ระบบสำเร็จ',
            result: customer
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: "เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง" 
        });
    }
});

// route ดึงประวัติการซื้อของลูกค้า
router.get("/customer/:id/purchases", async (req, res) => {
    try {
        const bills = await BillSaleModel.findAll({
            where: { customerId: req.params.id },
            include: [
                {
                    model: BillSaleDetailModel,
                    as: 'details',
                    include: [{
                        model: ProductModel,
                        as: 'product',
                        attributes: ['name', 'price'],
                        required: false
                    }]
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json({ 
            success: true,
            result: bills 
        });
    } catch (error) {
        console.error('Get purchase history error:', error);
        res.status(500).json({ 
            success: false, 
            message: "เกิดข้อผิดพลาดในการดึงข้อมูล" 
        });
    }
});

// เพิ่ม route สำหรับดึงรายละเอียดบิล
router.get("/bill/:id", async (req, res) => {
    try {
        const bill = await BillSaleModel.findOne({
            where: { id: req.params.id },
            include: [{
                model: BillSaleDetailModel,
                as: 'details',
                include: [{
                    model: ProductModel,
                    as: 'product',
                    required: false, // แก้เป็น false เพื่อให้แสดงรายการแม้ไม่มีข้อมูล Product
                    attributes: ['id', 'name', 'price']
                }]
            }]
        });

        if (!bill) {
            return res.status(404).json({
                success: false,
                message: "ไม่พบข้อมูลบิล"
            });
        }

        // ดึงข้อมูลสินค้าเพิ่มเติมสำหรับรายการที่ไม่มี Product
        const formattedBill = {
            ...bill.toJSON(),
            details: await Promise.all(bill.details.map(async detail => {
                let productName = 'ไม่พบชื่อสินค้า';
                
                if (!detail.product && detail.productId) {
                    const product = await ProductModel.findByPk(detail.productId);
                    if (product) {
                        productName = product.name;
                    }
                } else if (detail.product) {
                    productName = detail.product.name;
                }

                return {
                    id: detail.id,
                    productId: detail.productId,
                    productName: productName,
                    price: detail.price || 0,
                    qty: detail.qty || 0,
                    subtotal: (detail.price || 0) * (detail.qty || 0)
                };
            }))
        };


        res.json({ 
            success: true,
            result: formattedBill
        });
    } catch (error) {
        console.error('Get bill detail error:', error);
        res.status(500).json({ 
            success: false, 
            message: "เกิดข้อผิดพลาดในการดึงข้อมูล" 
        });
    }
});

// ดึงประวัติการใช้แต้ม
router.get("/customer/:id/point-history", async (req, res) => {
    try {
        const pointHistory = await PointTransactionModel.findAll({
            where: { customerId: req.params.id },
            order: [['transactionDate', 'DESC']],
        });
        
        res.json({ 
            success: true, 
            result: pointHistory 
        });
    } catch (error) {
        console.error('Error loading point history:', error); // ดู error ที่เกิดขึ้น
        res.status(500).json({
            success: false,
            message: "ไม่สามารถดึงข้อมูลประวัติการใช้แต้มได้",
            error: error.message
        });
    }
});

module.exports = router;