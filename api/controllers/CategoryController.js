require('dotenv').config();

const express = require("express");
const app = express();
app.disable('x-powered-by');
const jwt = require("jsonwebtoken");
const service = require("./Service");
const CategoryModel = require("../models/CategoryModel");

/**
 * API สำหรับดึงหมวดหมู่สินค้าทั้งหมดของผู้ใช้
 * @route GET /category/list
 * @description ดึงรายการหมวดหมู่สินค้าทั้งหมดสำหรับผู้ใช้ที่ล็อกอินอยู่
 * @access Private - ต้องมีการล็อกอินและมี token
 * @returns {Object} ส่งคืน message และ results เป็นอาร์เรย์ของหมวดหมู่ เรียงตาม name
 */
app.get("/category/list", async (req, res) => {
  try {
    // ดึง userId จากโทเคนที่แนบมากับ request
    const userId = await service.getMemberId(req);
    // ค้นหาหมวดหมู่ทั้งหมดของผู้ใช้นี้ เรียงตามชื่อ (A-Z)
    const categories = await CategoryModel.findAll({
      where: { userId: userId },
      order: [['name', 'ASC']]
    });
    // ส่งข้อมูลหมวดหมู่กลับไปให้ client
    res.json({ message: "success", results: categories });
  } catch (error) {
    // หากเกิดข้อผิดพลาด ส่งรหัสสถานะ 500 และข้อความข้อผิดพลาดกลับไป
    res.status(500).json({ message: "error", error: error.message });
  }
});

/**
 * API สำหรับดึงหมวดหมู่สินค้าตาม ID
 * @route GET /category/:id
 * @description ดึงข้อมูลหมวดหมู่สินค้าตาม ID ที่ระบุ
 * @param {string} id - ID ของหมวดหมู่ที่ต้องการดึงข้อมูล
 * @access Private - ต้องมีการล็อกอินและมี token
 * @returns {Object} ส่งคืนข้อมูลหมวดหมู่ หรือ 404 ถ้าไม่พบ
 */
app.get("/category/:id", async (req, res) => {
    try {
        // ดึง userId จาก token เพื่อตรวจสอบสิทธิ์
        const userId = await service.getMemberId(req);
        // เรียกใช้ service สำหรับดึงหมวดหมู่ตาม ID และ userId
        const category = await service.getCategoryById(req.params.id, userId);
        // ถ้าไม่พบหมวดหมู่ที่ตรงกับ ID ส่งรหัสสถานะ 404
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }
        // ส่งข้อมูลหมวดหมู่กลับไป
        res.json(category);
    } catch (error) {
        // จัดการกับข้อผิดพลาดและส่งกลับไปยัง client
        res.status(500).json({ error: error.message });
    }
});

/**
 * API สำหรับเพิ่มหมวดหมู่สินค้าใหม่
 * @route POST /category/insert
 * @description เพิ่มหมวดหมู่สินค้าใหม่ในระบบ
 * @body {Object} req.body - ข้อมูลของหมวดหมู่ที่จะเพิ่ม
 * @access Private - ต้องมีการล็อกอินและมี token
 * @returns {Object} ส่งคืน message และ results เป็นข้อมูลหมวดหมู่ที่เพิ่มแล้ว
 */
app.post("/category/insert", async (req, res) => {
    try {
        // ดึง userId จาก token
        const userId = await service.getMemberId(req);
        // สร้างหมวดหมู่ใหม่โดยใช้ข้อมูลจาก request body และใส่ userId ด้วย
        const newCategory = await CategoryModel.create({ 
            ...req.body,
            userId: userId 
        });
        // ส่ง response ยืนยันความสำเร็จพร้อมข้อมูลที่เพิ่มแล้ว
        res.json({ message: "success", results: newCategory });
    } catch (error) {
        // จัดการกับข้อผิดพลาดและส่งกลับไปยัง client
        res.status(500).json({ message: "error", error: error});
    }
});

/**
 * API สำหรับอัปเดตข้อมูลหมวดหมู่สินค้า
 * @route POST /category/update/:id
 * @description อัปเดตข้อมูลหมวดหมู่สินค้าตาม ID ที่ระบุ
 * @param {string} id - ID ของหมวดหมู่ที่ต้องการอัปเดต
 * @body {Object} req.body - ข้อมูลที่ต้องการอัปเดต
 * @access Private - ต้องมีการล็อกอินและมี token
 * @returns {Object} ส่งคืน message แสดงความสำเร็จ หรือ error ถ้าไม่สำเร็จ
 */
app.post("/category/update/:id", async (req, res) => {
    try {
        // ดึง userId จาก token เพื่อตรวจสอบสิทธิ์
        const userId = await service.getMemberId(req);
        // ค้นหาหมวดหมู่ที่ต้องการอัปเดตโดยตรวจสอบทั้ง ID และ userId เพื่อความปลอดภัย
        const category = await CategoryModel.findOne({
            where: { id: req.params.id, userId: userId }
        });
        
        // ถ้าไม่พบหมวดหมู่ที่ตรงกับ ID และ userId ส่งรหัสสถานะ 404
        if (!category) {
            return res.status(404).json({ message: "error", error: "Category not found" });
        }

        // อัปเดตข้อมูลหมวดหมู่ด้วยข้อมูลจาก request body
        await category.update(req.body);
        // ส่ง response ยืนยันความสำเร็จ
        res.json({ message: "success" });
    } catch (error) {
        // จัดการกับข้อผิดพลาดและส่งกลับไปยัง client
        res.status(500).json({ message: "error", error: error.message });
    }
});

/**
 * API สำหรับลบหมวดหมู่สินค้า
 * @route DELETE /category/delete/:id
 * @description ลบหมวดหมู่สินค้าตาม ID ที่ระบุ
 * @param {string} id - ID ของหมวดหมู่ที่ต้องการลบ
 * @access Private - ต้องมีการล็อกอินและมี token
 * @returns {Object} ส่งคืน message แสดงความสำเร็จ หรือ error ถ้าไม่สำเร็จ
 */
app.delete("/category/delete/:id", async (req, res) => {
    try {
        // ดึง userId จาก token เพื่อตรวจสอบสิทธิ์
        const userId = await service.getMemberId(req);
        // ลบหมวดหมู่โดยระบุทั้ง ID และ userId เพื่อความปลอดภัย
        const result = await CategoryModel.destroy({
            where: { id: req.params.id, userId: userId }
        });
        
        // ตรวจสอบผลลัพธ์การลบ - ถ้า result เป็น 0 แสดงว่าไม่พบข้อมูลที่ตรงกับเงื่อนไข
        if (result === 0) {
            return res.status(404).json({ message: "error", error: "Category not found" });
        }
        
        // ส่ง response ยืนยันความสำเร็จ
        res.json({ message: "success" });
    } catch (error) {
        // จัดการกับข้อผิดพลาดและส่งกลับไปยัง client
        res.status(500).json({ message: "error", error: error.message });
    }
});

module.exports = app;