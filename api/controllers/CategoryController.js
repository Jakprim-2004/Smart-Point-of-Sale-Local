require('dotenv').config();

const express = require("express");
const app = express();
app.disable('x-powered-by');
const jwt = require("jsonwebtoken");
const service = require("./Service");
const CategoryModel = require("../models/CategoryModel");


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
 * @description ลบหมวดหมู่สินค้าตาม ID ที่ระบุ และย้ายสินค้าไปหมวดหมู่ "อื่นๆ"
 * @param {string} id - ID ของหมวดหมู่ที่ต้องการลบ
 * @access Private - ต้องมีการล็อกอินและมี token
 * @returns {Object} ส่งคืน message แสดงความสำเร็จ หรือ error ถ้าไม่สำเร็จ
 */
app.delete("/category/delete/:id", async (req, res) => {
    try {
        const ProductModel = require("../models/ProductModel");
        
        // ดึง userId จาก token เพื่อตรวจสอบสิทธิ์
        const userId = await service.getMemberId(req);
        const categoryId = req.params.id;
        
        // ตรวจสอบว่าหมวดหมู่ที่จะลบมีอยู่จริง
        const categoryToDelete = await CategoryModel.findOne({
            where: { id: categoryId, userId: userId }
        });
        
        if (!categoryToDelete) {
            return res.status(404).json({ message: "error", error: "Category not found" });
        }
        
        // ตรวจสอบว่ามีสินค้าในหมวดหมู่นี้หรือไม่
        const productsInCategory = await ProductModel.count({
            where: { category: categoryId, userId: userId }
        });
        
        if (productsInCategory > 0) {
            // มีสินค้าอยู่ในหมวดหมู่นี้ ต้องย้ายไปหมวดหมู่ "อื่นๆ"
            
            // 1. หาหรือสร้างหมวดหมู่ "อื่นๆ"
            let otherCategory = await CategoryModel.findOne({
                where: { name: "อื่นๆ", userId: userId }
            });
            
            if (!otherCategory) {
                // สร้างหมวดหมู่ "อื่นๆ" ใหม่
                otherCategory = await CategoryModel.create({
                    name: "อื่นๆ",
                    userId: userId
                });
            }
            
            // 2. ย้ายสินค้าทั้งหมดไปหมวดหมู่ "อื่นๆ"
            await ProductModel.update(
                { category: otherCategory.id },
                { where: { category: categoryId, userId: userId } }
            );
        }
        
        // 3. ลบหมวดหมู่
        await CategoryModel.destroy({
            where: { id: categoryId, userId: userId }
        });
        
        // ส่ง response ยืนยันความสำเร็จพร้อมข้อมูลเพิ่มเติม
        res.json({ 
            message: "success",
            movedProducts: productsInCategory,
            info: productsInCategory > 0 
                ? `ย้ายสินค้า ${productsInCategory} รายการไปหมวดหมู่ "อื่นๆ" แล้ว` 
                : "ลบหมวดหมู่สำเร็จ"
        });
    } catch (error) {
        // จัดการกับข้อผิดพลาดและส่งกลับไปยัง client
        console.error("Error deleting category:", error);
        res.status(500).json({ message: "error", error: error.message });
    }
});

module.exports = app;