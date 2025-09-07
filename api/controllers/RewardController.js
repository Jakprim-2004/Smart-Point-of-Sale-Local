require('dotenv').config();

const express = require("express");
const app = express();
app.disable('x-powered-by');
const router = express.Router();
const RewardModel = require('../models/RewardModel');
const CustomerModel = require('../models/CustomerModel');
const PointTransactionModel = require('../models/PointTransactionModel'); 
const service = require('./Service');


// ดึงรายการของรางวัลทั้งหมด
router.get("/rewards", service.isLogin, async (req, res) => {
    try {
        const rewards = await RewardModel.findAll({
            order: [['id', 'DESC']]
        });
        res.json({ 
            message: 'success',
            results: rewards 
        });
    } catch (error) {
        res.status(500).json({ error: error.message }); 
    }
});

// ดึงประวัติการใช้แต้มสะสม (เฉพาะรายการแลกของรางวัลและส่วนลด)
router.get("/point-redemption-history", service.isLogin, async (req, res) => {
    try {
        // ดึงรายการ point transactions ที่เป็นประเภท REDEEM_REWARD หรือ DISCOUNT
        const redemptionTransactions = await PointTransactionModel.findAll({
            where: {
                transactionType: ['REDEEM_REWARD', 'DISCOUNT'] 
            },
            include: [
                { model: CustomerModel, as: 'Customer' }
            ],
            order: [['transactionDate', 'DESC']]
        });

        // คำนวณรวมแต้มที่ใช้ทั้งหมด
        const totalPointsUsed = redemptionTransactions.reduce(
            (sum, transaction) => sum + transaction.points, 0
        );

        res.json({
            message: 'success',
            results: redemptionTransactions,
            totalPointsUsed: totalPointsUsed
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ดึงของรางวัลตาม ID
router.get("/rewards/:id", service.isLogin, async (req, res) => {
    try {
        const reward = await RewardModel.findByPk(req.params.id);
        if (!reward) {
            return res.status(404).json({ error: "ไม่พบของรางวัล" });
        }
        res.json({ result: reward });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// สร้างของรางวัลใหม่
router.post("/rewards", service.isLogin, async (req, res) => {
    try {
        const userId = service.getAdminId(req); // ดึง userId จาก token
        if (!userId) {
            return res.status(400).json({ error: "กรุณาเข้าสู่ระบบใหม่" });
        }

        const rewardData = {
            ...req.body,
            userId: userId
        };

        const reward = await RewardModel.create(rewardData);
        res.json({ 
            message: 'success',
            result: reward 
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});


// อัพเดทของรางวัล
router.put("/rewards/:id", service.isLogin, async (req, res) => {
    try {
        const [updated] = await RewardModel.update(req.body, {
            where: { id: req.params.id }
        });
        if (!updated) {
            return res.status(404).json({ error: "ไม่พบของรางวัล" });
        }
        const updatedReward = await RewardModel.findByPk(req.params.id);
        res.json({ 
            message: 'success',
            result: updatedReward 
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// แลกของรางวัล
router.post("/rewards/redeem", service.isLogin, async (req, res) => {
    try {
        const { customerId, rewardId } = req.body;
        
        const customer = await CustomerModel.findByPk(customerId);
        const reward = await RewardModel.findByPk(rewardId);

        if (!customer || !reward) {
            return res.status(404).json({ error: "ไม่พบข้อมูลลูกค้าหรือของรางวัล" });
        }

        if (customer.points < reward.pointsCost) {
            return res.status(400).json({ error: "แต้มสะสมไม่เพียงพอ" });
        }

        if (reward.stock <= 0) {
            return res.status(400).json({ error: "ของรางวัลหมด" });
        }

        // หักแต้มและอัพเดทสต็อก
        customer.points -= reward.pointsCost;
        reward.stock -= 1;

        await customer.save();
        await reward.save();

        // บันทึกการใช้แต้มแลกของรางวัล
        await PointTransactionModel.create(req.body.pointTransaction);

        // ดึงข้อมูลของรางวัลทั้งหมดที่อัปเดตแล้ว
        const updatedRewards = await RewardModel.findAll({
            order: [['id', 'DESC']]
        });

        res.json({ 
            message: 'success',
            result: {
                customer: customer,
                reward: reward,
                updatedRewards: updatedRewards
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ลบของรางวัล
router.delete("/rewards/:id", service.isLogin, async (req, res) => {
    try {
        const deleted = await RewardModel.destroy({
            where: { id: req.params.id }
        });
        if (!deleted) {
            return res.status(404).json({ error: "ไม่พบของรางวัล" });
        }
        res.json({ message: "success" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
