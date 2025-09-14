const express = require("express");
const app = express();
app.disable('x-powered-by');
const jwt = require("jsonwebtoken");
require("dotenv").config();
const service = require("./Service");
const BillSaleModel = require("../models/BillSaleModel");
const BillSaleDetailModel = require("../models/BillSaleDetailModel");
const CustomerModel = require("../models/CustomerModel"); 
const PointTransactionModel = require('../models/PointTransactionModel');
const Defer_paymentModel = require('../models/Defer_paymentModel');
const ProductModel = require('../models/ProductModel'); 



// API สำหรับเปิดบิลขายใหม่
app.get('/billSale/openBill', service.isLogin, async (req, res) => {
    try {
        // ใช้เวลาท้องถิ่นปัจจุบัน (ระบบอยู่ใน timezone Asia/Bangkok แล้ว)
        const now = new Date();
        
        // เตรียมข้อมูลสำหรับสร้างบิลใหม่
        const payload = {
            userId: service.getMemberId(req), // ดึงรหัสผู้ใช้จาก request
            status: 'open', // ตั้งสถานะบิลเป็นเปิด
            createdAt: now // ใช้เวลาปัจจุบันโดยตรง
        };

        // ตรวจสอบว่ามีบิลที่เปิดอยู่ของผู้ใช้หรือไม่
        let result = await BillSaleModel.findOne({
            where: {
                userId: payload.userId,
                status: 'open'
            }
        });

        // ถ้าไม่มีบิลที่เปิดอยู่ ให้สร้างบิลใหม่
        if (result == null) {
            result = await BillSaleModel.create(payload);
        }

        // ส่งผลลัพธ์สำเร็จพร้อมข้อมูลบิล
        res.send({ message: 'success', result: result });
    } catch (e) {
        // ส่งข้อความข้อผิดพลาดเมื่อเกิดปัญหา
        res.statusCode = 500;
        res.send({ message: e.message });
    }
});

// API สำหรับเพิ่มสินค้าลงในบิลขาย
app.post('/billSale/sale', service.isLogin, async (req, res) => {
    try {
        const userId = service.getMemberId(req);
        
        // เตรียมข้อมูลสำหรับเพิ่มสินค้า
        const payload = {
            userId: service.getMemberId(req),
            status: 'open'
        };

        // ดึงข้อมูลบิลปัจจุบัน
        const currentBill = await BillSaleModel.findOne({
            where: payload
        });

        // เตรียมข้อมูลรายการสินค้า (item) ที่จะเพิ่มลงในบิล
        // โดยใช้ข้อมูลจาก request body และ payload ที่สร้างไว้ก่อนหน้า
        const item = {
            price: req.body.price,         // ราคาสินค้าจาก request
            productId: req.body.id,        // รหัสสินค้าจาก request
            billSaleId: currentBill.id,    // รหัสบิลที่ได้จากการค้นหาบิลปัจจุบัน
            userId: payload.userId,        // รหัสผู้ใช้จาก payload
            qty: req.body.qty              // จำนวนสินค้าที่ต้องการเพิ่ม
        }

        // ตรวจสอบว่ามีสินค้านี้อยู่ในบิลปัจจุบันแล้วหรือไม่
        // โดยค้นหาจากรหัสสินค้า (productId) และรหัสบิล (billSaleId)
        const billSaleDetail = await BillSaleDetailModel.findOne({
            where: {
                productId: item.productId,   // ค้นหาจากรหัสสินค้า
                billSaleId: item.billSaleId  // และรหัสบิล
            }
        });

        // เงื่อนไขแรก: ถ้าไม่พบสินค้านี้ในบิล (billSaleDetail เป็น null)
        if (billSaleDetail == null) {
            // สร้างรายการใหม่ในตาราง BillSaleDetail ด้วยข้อมูลจาก item
            await BillSaleDetailModel.create(item);
        } else {
            // เงื่อนไขที่สอง: ถ้าพบว่ามีสินค้านี้อยู่ในบิลแล้ว
            // ให้คำนวณจำนวนสินค้าใหม่โดยนำจำนวนที่มีอยู่เดิมบวกกับจำนวนที่ต้องการเพิ่ม
            // โดยแปลงเป็น integer ด้วย parseInt เพื่อป้องกันการคำนวณผิดพลาดจากข้อมูล string
            item.qty = parseInt(billSaleDetail.qty) + parseInt(item.qty);
            
            // อัปเดตข้อมูลในตาราง BillSaleDetail ตามรหัสรายการ (id)
            await BillSaleDetailModel.update(item, {
                where: {
                    id: billSaleDetail.id  // อัปเดตเฉพาะรายการที่ตรงกับ id
                }
            });
        }

        res.send({ message: 'success' });
    } catch (e) {
        res.statusCode = 500;
        res.send({ message: e.message });
    }
});



// API สำหรับดึงข้อมูลบิลปัจจุบัน
app.get('/billSale/currentBillInfo', service.isLogin, async (req, res) => {
    try {
        const BillSaleDetailModel = require('../models/BillSaleDetailModel');
        const ProductModel = require('../models/ProductModel');

        // กำหนดความสัมพันธ์ระหว่างโมเดล
        BillSaleModel.hasMany(BillSaleDetailModel);
        BillSaleDetailModel.belongsTo(ProductModel);

        // ดึงข้อมูลบิลปัจจุบันพร้อมรายละเอียดสินค้า
        const results = await BillSaleModel.findOne({
            where: {
                status: 'open',
                userId: service.getMemberId(req)
            },
            include: {
                model: BillSaleDetailModel,
                order: [['id', 'DESC']],
                include: {
                    model: ProductModel,
                    attributes: ['name']
                }
            }
        })

        res.send({ results: results });
    } catch (e) {
        res.statusCode = 500;
        res.send({ message: e.messag });
    }
});

// API สำหรับลบรายการสินค้าในบิล
app.delete('/billSale/deleteItem/:id', service.isLogin, async (req, res) => {
    try {
        // ลบรายการสินค้าตาม ID
        await BillSaleDetailModel.destroy({
            where: {
                id: req.params.id
            }
        });
        res.send({ message: 'success' });
    } catch (e) {
        res.statusCode = 500;
        res.send({ message: 'success' });
    }
});

// API สำหรับล้างตะกร้าสินค้าทั้งหมด
app.delete('/billSale/clearCart/:id', service.isLogin, async (req, res) => {
    try {
        // ตรวจสอบว่ามีบิลนี้อยู่จริงหรือไม่
        const bill = await BillSaleModel.findOne({
            where: {
                id: req.params.id,
                status: 'open',
                userId: service.getMemberId(req)
            }
        });

        if (!bill) {
            return res.status(404).send({
                message: 'ไม่พบบิลที่ต้องการล้างตะกร้า'
            });
        }

        // ลบรายการสินค้าทั้งหมดในบิล
        await BillSaleDetailModel.destroy({
            where: {
                billSaleId: req.params.id
            }
        });

        res.send({ message: 'success' });
    } catch (e) {
        res.status(500).send({ 
            message: 'เกิดข้อผิดพลาด',
            error: e.message 
        });
    }
});

// API สำหรับอัปเดตจำนวนสินค้าในบิล
app.post('/billSale/updateQty', service.isLogin, async (req, res) => {
    try {
        // อัปเดตจำนวนสินค้า
        await BillSaleDetailModel.update({
            qty: req.body.qty
        }, {
            where: {
                id: req.body.id
            }
        })

        res.send({ message: 'success' });
    } catch (e) {
        res.statusCode = 500;
        res.send({ mesage: e.mesage });
    }
});

// API สำหรับจบการขาย
app.post('/billSale/endSale', service.isLogin, async (req, res) => {
    try {
        const { method, amount, billSaleDetails, customerId, description } = req.body;
        // ใช้เวลาท้องถิ่นปัจจุบัน (ระบบอยู่ใน timezone Asia/Bangkok แล้ว)
        const now = new Date();
        
        
        
        // สร้าง update payload โดยไม่รวม customerId ก่อน
        const updatePayload = {
            status: 'pay',
            paymentMethod: method,
            payDate: now,
            totalAmount: amount,
            // ไม่อัปเดต createdAt เพราะต้องเก็บเวลาที่สร้างบิลเดิม
            updatedAt: now,
            description: description || ""
        };
        
        // ตรวจสอบ customerId ว่ามีค่าและเป็น ID ที่มีอยู่จริง
        if (customerId !== null && customerId !== undefined && customerId !== 'null' && customerId !== 'undefined') {
            try {
                // แปลงเป็น integer และตรวจสอบว่าลูกค้ามีอยู่จริง
                const customerIdInt = parseInt(customerId, 10);
                if (!isNaN(customerIdInt)) {
                    const customer = await CustomerModel.findByPk(customerIdInt);
                    if (customer) {
                        updatePayload.customerId = customerIdInt;
                    } else {
                    }
                }
            } catch (err) {
            }
        }
        
        const updatedBill = await BillSaleModel.update(updatePayload, {
            where: {
                status: 'open',
                userId: service.getMemberId(req)
            }
        });

        for (const detail of billSaleDetails) {
            const subtotal = detail.qty * detail.price;
            
            // สร้าง update payload สำหรับ detail
            const updateDetailPayload = {
                totalprice: subtotal,
                updatedAt: now
            };
            
            // เพิ่ม customerId และ pointsEarned เฉพาะเมื่อมี customerId ที่ถูกต้อง
            if (updatePayload.customerId) {
                updateDetailPayload.customerId = updatePayload.customerId;
                updateDetailPayload.pointsEarned = Math.floor(subtotal / 100);
            } else {
                updateDetailPayload.customerId = null;
                updateDetailPayload.pointsEarned = 0;
            }

            await BillSaleDetailModel.update(updateDetailPayload, {
                where: { id: detail.id }
            });
        }

        // อัปเดตแต้มลูกค้า
        if (updatePayload.customerId) {
            const customer = await CustomerModel.findByPk(updatePayload.customerId);
            if (customer) {
                const pointsEarned = customer.calculatePoints(amount);
                customer.points += pointsEarned;
                customer.totalSpent = parseFloat(customer.totalSpent || 0) + parseFloat(amount);
                customer.lastPurchaseDate = new Date();
                customer.updateMembershipTier();
                await customer.save();
            }
        }

        // บันทึกการใช้แต้มลดราคา (ถ้ามี)
        if (req.body.pointTransaction && updatePayload.customerId) {
            const customer = await CustomerModel.findByPk(updatePayload.customerId);
            if (customer) {
                const pointsUsed = Math.abs(req.body.pointTransaction.points);
                
                // หักแต้มออกจากยอดแต้มสะสมของลูกค้า
                customer.points = Math.max(0, customer.points - pointsUsed);
                customer.updateMembershipTier(); // อัพเดตระดับสมาชิก
                await customer.save();
                
                // บันทึกประวัติการใช้แต้ม (เก็บค่าลบเพื่อระบุว่าเป็นการใช้)
                const pointTransaction = {
                    ...req.body.pointTransaction,
                    customerId: updatePayload.customerId,
                    points: -pointsUsed // บันทึกเป็นค่าลบเพื่อแยกแยะประวัติ
                };
                await PointTransactionModel.create(pointTransaction);
            }
        }

        res.json({ message: 'success', result: updatedBill });
    } catch (error) {
        res.status(500).json({ 
            message: 'error', 
            error: error.message,
            detail: error.original ? error.original.detail : null,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// API สำหรับดึงบิลล่าสุด
app.get('/billSale/lastBill', service.isLogin, async (req, res) => {
    try {
        const BillSaleDetailModel = require('../models/BillSaleDetailModel');
        const ProductModel = require('../models/ProductModel');

        // กำหนดความสัมพันธ์ระหว่างโมเดล
        BillSaleModel.hasMany(BillSaleDetailModel);
        BillSaleDetailModel.belongsTo(ProductModel);

        // ดึงข้อมูลบิลล่าสุด พร้อมข้อมูลลูกค้า
        const result = await BillSaleModel.findAll({
            where: {
                status: 'pay',
                userId: service.getMemberId(req)
            },
            order: [['id', 'DESC']],
            limit: 1,
            include: [
                {
                    model: BillSaleDetailModel,
                    attributes: ['qty', 'price'],
                    include: {
                        model: ProductModel,
                        attributes: ['barcode', 'name']
                    }
                },
                {
                    model: CustomerModel,
                    attributes: ['idcustomers', 'name']
                }
            ]
        });

        res.send({ message: 'success', result: result });
    } catch (e) {
        res.statusCode = 500;
        res.send({ message: e.message });
    }
});

// API สำหรับดึงรายการบิลทั้งหมด
app.get('/billSale/list', service.isLogin, async (req, res) => {
    const BillSaleDetailModel = require('../models/BillSaleDetailModel');
    const ProductModel = require('../models/ProductModel');

    // กำหนดความสัมพันธ์ระหว่างโมเดล
    BillSaleModel.hasMany(BillSaleDetailModel);
    BillSaleDetailModel.belongsTo(ProductModel);

    try {
        // ดึงรายการบิลทั้งหมด
        const results = await BillSaleModel.findAll({
            attributes: ['id', 'payDate', 'paymentMethod', 'status', 'userId','totalAmount', 'description'],
            order: [['id', 'DESC']],
            where: {
                status: 'pay',
                userId: service.getMemberId(req)
            },
            include: {
                model: BillSaleDetailModel,
                include: {
                    model: ProductModel
                }
            }
        });
       
        res.send({ message: 'success', results: results });
    } catch (e) {
        res.statusCode = 500;
        res.send({ message: e.message });
    }
});

// API สำหรับดึงรายการบิลตามปีและเดือน
app.get('/billSale/listByYearAndMonth/:year/:month', service.isLogin, async (req, res) => {
    try {
        let arr = [];
        let y = req.params.year;
        let m = req.params.month;
        let daysInMonth = new Date(y, m, 0).getDate();

        const { Sequelize } = require('sequelize');
        const Op = Sequelize.Op;
        const BillSaleDetailModel = require('../models/BillSaleDetailModel');
        const ProductModel = require('../models/ProductModel');

        // กำหนดความสัมพันธ์ระหว่างโมเดล
        BillSaleModel.hasMany(BillSaleDetailModel);
        BillSaleDetailModel.belongsTo(ProductModel);

        // ดึงข้อมูลบิลตามวันในเดือน
        for (let i = 1; i <= daysInMonth; i++) {
            let startDate = new Date(y, m-1, i, 0, 0, 0);
            let endDate = new Date(y, m-1, i, 23, 59, 59);

            const results = await BillSaleModel.findAll({
                where: {
                    userId: service.getMemberId(req),
                    status: 'pay',
                    createdAt: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                include: {
                    model: BillSaleDetailModel,
                    include: {
                        model: ProductModel
                    }
                }
            });

            // คำนวณยอดขายรวมของแต่ละวัน
            let sum = 0;
            if (results.length > 0) {
                for (let result of results) {
                    for (let detail of result.billSaleDetails) {
                        sum += parseInt(detail.qty) * parseInt(detail.price);
                    }
                }
            }

            // เพิ่มข้อมูลยอดขายรายวัน
            arr.push({
                day: i,
                date: startDate,
                results: results,
                sum: sum
            });
        }

        res.send({ message: 'success', results: arr });
    } catch (e) {
        res.statusCode = 500;
        res.send({ message: e.message });
    }
})

// API สำหรับพักบิล - เก็บบิลลงฐานข้อมูล (แบบไม่ใช้ transaction)
app.post('/billSale/holdBill', service.isLogin, async (req, res) => {
    try {
        const userId = service.getMemberId(req);
        
        // กำหนด associations
        const BillSaleDetailModel = require('../models/BillSaleDetailModel');
        const ProductModel = require('../models/ProductModel');
        
        BillSaleModel.hasMany(BillSaleDetailModel, { foreignKey: 'billSaleId' });
        BillSaleDetailModel.belongsTo(ProductModel, { foreignKey: 'productId' });
        
        // ค้นหาบิลที่เปิดอยู่
        const currentBill = await BillSaleModel.findOne({
            where: {
                userId: userId,
                status: 'open'
            },
            include: [{
                model: BillSaleDetailModel,
                include: [{
                    model: ProductModel,
                    attributes: ['name']
                }]
            }]
        });

        if (!currentBill || !currentBill.billSaleDetails || currentBill.billSaleDetails.length === 0) {
            return res.status(400).json({ 
                message: 'error',
                error: 'ไม่มีสินค้าในบิลที่จะพัก' 
            });
        }

        // สร้างเวลาท้องถิ่นปัจจุบัน (ระบบอยู่ใน timezone Asia/Bangkok แล้ว)
        const now = new Date();

        // คำนวณยอดรวมของบิล
        let totalAmount = 0;
        currentBill.billSaleDetails.forEach(detail => {
            totalAmount += parseFloat(detail.qty) * parseFloat(detail.price);
        });

        // บันทึกข้อมูลการพักบิลในตาราง Defer_payment
        const heldBill = await Defer_paymentModel.create({
            billSaleId: currentBill.id,
            userId: userId,
            totalAmount: totalAmount,
            heldAt: now,
            status: 'held'
        });

        // เปลี่ยนสถานะบิลเป็น 'held'
        await BillSaleModel.update(
            { status: 'held' },
            { where: { id: currentBill.id } }
        );

        res.json({ 
            message: 'success',
            result: {
                id: heldBill.id,
                billSaleId: currentBill.id,
                totalAmount: totalAmount,
                heldAt: now
            }
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'error',
            error: error.message 
        });
    }
});

// API สำหรับดูรายการบิลที่พักไว้
app.get('/billSale/heldBills', service.isLogin, async (req, res) => {
    try {
        const userId = service.getMemberId(req);
        
        // กำหนด associations
        const BillSaleDetailModel = require('../models/BillSaleDetailModel');
        const ProductModel = require('../models/ProductModel');
        
        BillSaleModel.hasMany(BillSaleDetailModel, { foreignKey: 'billSaleId' });
        BillSaleDetailModel.belongsTo(ProductModel, { foreignKey: 'productId' });
        Defer_paymentModel.belongsTo(BillSaleModel, { foreignKey: 'billSaleId', constraints: false });
        
        // ลบบิลที่พักไว้เกิน 1 วันออกจากฐานข้อมูล
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        await Defer_paymentModel.destroy({
            where: {
                status: 'held',
                heldAt: { [require('sequelize').Op.lt]: oneDayAgo }
            }
        });

        // ดึงรายการบิลที่พักไว้พร้อมรายละเอียด (เฉพาะ status = 'held')
        const heldBills = await Defer_paymentModel.findAll({
            where: {
                userId: userId,
                status: 'held'
            },
            include: [{
                model: BillSaleModel,
                required: false,
                include: [{
                    model: BillSaleDetailModel,
                    required: false,
                    include: [{
                        model: ProductModel,
                        attributes: ['name'],
                        required: false
                    }]
                }]
            }],
            order: [['heldAt', 'DESC']]
        });

        res.json({
            message: 'success',
            results: heldBills
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'error',
            error: error.message 
        });
    }
});

// API สำหรับเรียกคืนบิลที่พักไว้ 
app.post('/billSale/retrieveBill/:id', service.isLogin, async (req, res) => {
    try {
        const userId = service.getMemberId(req);
        const heldBillId = req.params.id;
        
        // ค้นหาบิลที่เปิดอยู่
        const existingOpenBill = await BillSaleModel.findOne({
            where: {
                userId: userId,
                status: 'open'
            }
        });

        // ถ้ามีบิลที่เปิดอยู่ ให้จัดการบิลนั้นก่อน
        if (existingOpenBill) {
            // ตรวจสอบว่าบิลที่เปิดอยู่มีสินค้าหรือไม่
            const existingBillDetails = await BillSaleDetailModel.findAll({
                where: { billSaleId: existingOpenBill.id }
            });

            if (existingBillDetails.length > 0) {
                // ถ้ามีสินค้า ให้พักบิลปัจจุบันก่อน
                const now = new Date();

                // คำนวณยอดรวมของบิลที่มีอยู่
                let totalAmount = 0;
                existingBillDetails.forEach(detail => {
                    totalAmount += parseFloat(detail.qty) * parseFloat(detail.price);
                });

                // สร้างรายการพักบิลสำหรับบิลปัจจุบัน
                await Defer_paymentModel.create({
                    billSaleId: existingOpenBill.id,
                    userId: userId,
                    totalAmount: totalAmount,
                    heldAt: now,
                    status: 'held'
                });

                // เปลี่ยนสถานะบิลปัจจุบันเป็น 'held'
                await BillSaleModel.update(
                    { status: 'held' },
                    { where: { id: existingOpenBill.id } }
                );
            } else {
                // ถ้าไม่มีสินค้า ให้ลบบิลเปล่านี้
                await BillSaleModel.destroy({
                    where: { id: existingOpenBill.id }
                });
            }
        }

        // ค้นหาบิลที่พักไว้
        const heldBill = await Defer_paymentModel.findOne({
            where: {
                id: heldBillId,
                userId: userId,
                status: 'held'
            }
        });

        if (!heldBill) {
            return res.status(404).json({
                message: 'error',
                error: 'ไม่พบบิลที่พักไว้'
            });
        }

        // ลบบิลที่พักออกจากฐานข้อมูลหลังจากเรียกคืน
        await Defer_paymentModel.destroy({ where: { id: heldBillId } });

        // เปลี่ยนสถานะบิลกลับเป็น 'open'
        await BillSaleModel.update(
            { status: 'open' },
            { where: { id: heldBill.billSaleId } }
        );

        res.json({
            message: 'success',
            billSaleId: heldBill.billSaleId
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'error',
            error: error.message 
        });
    }
});





module.exports = app;