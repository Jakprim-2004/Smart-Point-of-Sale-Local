const express = require("express");
const MemberModel = require("../models/MemberModel");
const { Op } = require("sequelize");
const app = express();
const jwt = require("jsonwebtoken");
require("dotenv").config();
const service = require("./Service");
const { encryptPassword, comparePassword } = require('../utils/encryption');

app.post("/member/check-duplicate", async (req, res) => {
  try {
    const { email, phone } = req.body;
    let whereClause = {};
    
    if (email) {
      whereClause.email = email;
    }
    if (phone) {
      whereClause.phone = phone;
    }

    const existingMember = await MemberModel.findOne({
      where: whereClause
    });

    res.send({ 
      message: "success",
      isDuplicate: !!existingMember,
      detail: existingMember ? 
        `${email ? 'อีเมล' : 'เบอร์โทรศัพท์'}นี้มีผู้ใช้งานแล้ว` : 
        'สามารถใช้งานได้'
    });
  } catch (e) {
    res.status(500).send({ message: e.message });
  }
});

app.post("/member/signin", async (req, res) => {
  try {
    const searchCriteria = {};
    if (req.body.email) {
      searchCriteria.email = req.body.email;
    }
    if (req.body.phone) {
      searchCriteria.phone = req.body.phone;
    }

    const member = await MemberModel.findOne({
      where: {
        [Op.or]: [searchCriteria]
      }
    });

    if (member) {
      const validPassword = await comparePassword(req.body.password, member.pass);
      if (validPassword) {
        // สร้าง Access Token (หมดอายุใน 24 ชั่วโมง)
        const accessToken = jwt.sign(
          { id: member.id, type: 'access' }, 
          process.env.secret, 
          { expiresIn: '24h' }
        );

        res.send({ 
          token: accessToken,
          message: "success"
        });
      } else {
        res.statusCode = 401;
        res.send({ message: "รหัสผ่านไม่ถูกต้อง" });
      }
    } else {
      res.statusCode = 401;
      res.send({ message: "ไม่พบบัญชีผู้ใช้" });
    }
  } catch (e) {
    res.statusCode = 500;
    res.send({ message: e.message });
  }
});

app.post("/member/register", async (req, res) => {
  try {
    const { email, phone, password, firstName, lastName } = req.body;
    
    // ตรวจสอบว่ามีข้อมูลครบถ้วน
    if (!email && !phone) {
      return res.status(400).send({ message: "กรุณาระบุอีเมลหรือเบอร์โทรศัพท์" });
    }
    if (!password) {
      return res.status(400).send({ message: "กรุณาระบุรหัสผ่าน" });
    }
    if (!firstName || !lastName) {
      return res.status(400).send({ message: "กรุณาระบุชื่อและนามสกุล" });
    }

    // ตรวจสอบว่ามีผู้ใช้อยู่แล้วหรือไม่
    const existingMember = await MemberModel.findOne({
      where: {
        [Op.or]: [
          email ? { email: email } : {},
          phone ? { phone: phone } : {}
        ]
      }
    });

    if (existingMember) {
      return res.status(400).send({ message: "อีเมลหรือเบอร์โทรศัพท์นี้มีผู้ใช้งานแล้ว" });
    }

    // เข้ารหัสรหัสผ่าน
    const hashedPassword = await encryptPassword(password);

    // สร้างผู้ใช้ใหม่
    const newMember = await MemberModel.create({
      email: email || null,
      phone: phone || null,
      pass: hashedPassword,
      firstName: firstName,
      lastName: lastName
    });

    res.send({ 
      message: "success",
      member: {
        id: newMember.id,
        email: newMember.email,
        phone: newMember.phone,
        firstName: newMember.firstName,
        lastName: newMember.lastName
      }
    });
  } catch (e) {
    console.error('Registration error:', e);
    res.status(500).send({ message: e.message });
  }
});

app.post("/member/logout", service.isLogin, async (req, res) => {
  try {
    res.send({ message: "Logged out successfully" });
  } catch (e) {
    console.error('Logout error:', e);
    res.status(500).send({ message: e.message });
  }
});

app.get("/member/info", service.isLogin, async (req, res) => {
  try {
    const memberId = service.getMemberId(req);
    const member = await MemberModel.findByPk(memberId, {
      attributes: ['id', 'email', 'phone', 'firstName', 'lastName', 'createdAt']
    });

    if (!member) {
      return res.status(404).send({ message: "ไม่พบข้อมูลผู้ใช้" });
    }

    res.send({ 
      message: "success",
      member: member
    });
  } catch (e) {
    console.error('Get member info error:', e);
    res.status(500).send({ message: e.message });
  }
});

module.exports = app;