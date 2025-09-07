require('dotenv').config();
const express = require("express");
const app = express();
app.disable('x-powered-by');
const router = express.Router();
const StockModel = require('../models/StockModel');
const BillSaleDetailModel = require('../models/BillSaleDetailModel');
const ProductModel = require('../models/ProductModel');
const BillSaleModel = require('../models/BillSaleModel');
const sequelize = require('sequelize');
const service = require("./Service");
// Import associations to ensure they are loaded
require('../models/associations');


router.post("/reportSumSalePerMonth", async (req, res) => {
  try {
    const { year, month, viewType } = req.body;
    const userId = service.getMemberId(req);
    
    console.log('=== REPORT SUM SALE PER MONTH DEBUG ===');
    console.log('Request params:', { year, month, viewType, userId });
    
    // กำหนดค่าสำหรับมุมมองรายวันหรือรายเดือน
    const dateUnit = viewType === "daily" ? "DAY" : "MONTH";
    const dateAlias = viewType === "daily" ? "day" : "month";
    
    // สร้าง attributes ที่ต้องการเลือก - ใช้ AT TIME ZONE แทน TIMEZONE function
    const attributes = [
      [sequelize.fn("EXTRACT", sequelize.literal(`${dateUnit} FROM ("billSale"."payDate" AT TIME ZONE 'Asia/Bangkok')`)), dateAlias],
      [sequelize.fn("SUM", sequelize.literal(`"billSaleDetail"."price" * "billSaleDetail"."qty"`)), "sum"],
      [sequelize.fn("SUM", sequelize.literal(`("billSaleDetail"."price" - "product"."cost") * "billSaleDetail"."qty"`)), "profit"],
      [sequelize.fn("SUM", sequelize.literal(`"product"."cost" * "billSaleDetail"."qty"`)), "cost"]
    ];
    
    // สร้างเงื่อนไข where สำหรับ billSale - ใช้ AT TIME ZONE แทน TIMEZONE function
    const billSaleWhere = {
      userId,
      status: 'pay',
      [sequelize.Op.and]: [
        sequelize.where(sequelize.fn("EXTRACT", sequelize.literal(`YEAR FROM ("billSale"."payDate" AT TIME ZONE 'Asia/Bangkok')`)), year)
      ]
    };
    
    // เงื่อนไขกรองตามเดือน (เฉพาะมุมมองรายวัน)
    if (viewType === "daily") {
      billSaleWhere[sequelize.Op.and].push(
        sequelize.where(sequelize.fn("EXTRACT", sequelize.literal(`MONTH FROM ("billSale"."payDate" AT TIME ZONE 'Asia/Bangkok')`)), month)
      );
    }
    
    // ดึงข้อมูลจากฐานข้อมูล
    const results = await BillSaleDetailModel.findAll({
      attributes,
      include: [
        { 
          model: ProductModel, 
          as: 'product',  
          attributes: [],
          required: true
        }, 
        {
          model: BillSaleModel,
          as: 'billSale',
          attributes: [],
          where: billSaleWhere,
          required: true
        }
      ],
      group: [sequelize.fn("EXTRACT", sequelize.literal(`${dateUnit} FROM ("billSale"."payDate" AT TIME ZONE 'Asia/Bangkok')`))],
      order: [[sequelize.fn("EXTRACT", sequelize.literal(`${dateUnit} FROM ("billSale"."payDate" AT TIME ZONE 'Asia/Bangkok')`)), 'ASC']],
      raw: true
    });
    
    // แปลงข้อมูลให้อยู่ในรูปแบบที่ใช้งานง่าย
    const formattedResults = results.map(item => {
      const result = {
        day: parseInt(item.day) || null,
        month: parseInt(item.month) || null,
        sum: parseFloat(item.sum || 0),
        profit: parseFloat(item.profit || 0),
        cost: parseFloat(item.cost || 0)
      };
      return result;
    });
    
    // สร้างข้อมูลสมบูรณ์สำหรับทุกวัน/เดือน
    let completeResults = [];
    if (viewType === "daily") {
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const existingData = formattedResults.find(item => item.day === day);
        completeResults.push({
          day: day,
          sum: existingData ? existingData.sum : 0,
          profit: existingData ? existingData.profit : 0,
          cost: existingData ? existingData.cost : 0
        });
      }
    } else {
      for (let month = 1; month <= 12; month++) {
        const existingData = formattedResults.find(item => item.month === month);
        completeResults.push({
          month: month,
          sum: existingData ? existingData.sum : 0,
          profit: existingData ? existingData.profit : 0,
          cost: existingData ? existingData.cost : 0
        });
      }
    }
    
    // แสดงข้อมูลวันที่มีข้อมูลเพื่อการตรวจสอบ
    if (viewType === "daily") {
      const daysWithData = formattedResults
        .filter(item => item && item.day && item.sum > 0)
        .map(item => item.day)
        .sort((a, b) => a - b);
      
    }
    
    // คำนวณผลรวม
    const totalSales = completeResults.reduce((sum, item) => sum + (item.sum || 0), 0);
    const totalProfit = completeResults.reduce((sum, item) => sum + (item.profit || 0), 0);
    const totalCost = completeResults.reduce((sum, item) => sum + (item.cost || 0), 0);
    
    
    // ส่งผลลัพธ์กลับไป
    res.send({
      message: "success",
      results: completeResults,
      totalSales,
      totalProfit,
      totalCost
    });
  } catch (error) {
    console.error("Error in reportSumSalePerMonth:", error);
    res.status(500).send({ message: error.message });
  }
});

router.get('/reportStock', async (req, res) => {
  try {
    const userId = service.getMemberId(req); 
    const stocks = await StockModel.findAll({
      attributes: ['productId', 'qty'],
      include: [{ 
        model: ProductModel, 
        attributes: ['name'],
        required: false // LEFT JOIN เพื่อรวมรายการที่ไม่มี product
      }],
      where: { userId: userId } 
    });

    const billSaleDetails = await BillSaleDetailModel.findAll({
      attributes: ['productId', [sequelize.fn('SUM', sequelize.col('qty')), 'totalQty']],
      group: ['productId'],
      where: { userId: userId } 
    });

    const stockMap = new Map();

    stocks.forEach(stock => {
      const productId = stock.productId;
      const productName = stock.Product ? stock.Product.name : 'สินค้าไม่ระบุชื่อ';
      const currentStock = stockMap.get(productId) || {
        productId: productId,
        productName: productName,
        totalQty: 0 
      };

      currentStock.totalQty += parseInt(stock.qty, 10); 
      stockMap.set(productId, currentStock);
    });

    billSaleDetails.forEach(bill => {
      const productId = bill.productId;
      if (stockMap.has(productId)) {
        const currentStock = stockMap.get(productId);
        const soldQty = parseInt(bill.dataValues.totalQty, 10);
        currentStock.totalQty = Math.max(0, currentStock.totalQty - soldQty); 
      }
    });

    const totalStock = Array.from(stockMap.values());

    res.send({ message: 'success', results: totalStock });
  } catch (error) {
    console.error('Error in reportStock:', error);
    res.status(500).send({ message: error.message });
  }
});

router.get('/reportTopSellingProducts', async (req, res) => {
  try {
    const userId = service.getMemberId(req); 
    // ใช้เวลาไทยปัจจุบันโดยตรง
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get product info first
    const products = await ProductModel.findAll({
      attributes: ['id', 'name', 'price'],
      where: { userId: userId },
      raw: true
    });

    const productMap = new Map();
    products.forEach(product => {
      productMap.set(product.id, {
        name: product.name || 'สินค้าไม่มีชื่อ',
        price: parseFloat(product.price || 0)
      });
    });

    // Get all paid billSales for today - ใช้ payDate ที่แปลงเป็นเวลาไทยและรองรับ timezone
    const paidBills = await BillSaleModel.findAll({
      attributes: ['id'],
      where: {
        userId: userId,
        status: 'pay',
        // ใช้ DATE function กับ timezone conversion ที่ชัดเจน
        [sequelize.Op.and]: [
          sequelize.where(
            sequelize.fn('DATE', 
              sequelize.fn('TIMEZONE', 'Asia/Bangkok', 
                sequelize.fn('TIMEZONE', 'UTC', sequelize.col('payDate'))
              )
            ), 
            sequelize.fn('DATE', today)
          )
        ]
      },
      raw: true
    });

    if (paidBills.length === 0) {
      // Return default data for empty state
      return res.send({ 
        message: 'success', 
        results: [{
          productId: 0,
          productName: 'ไม่มีข้อมูลการขาย',
          totalQty: 0,
          totalAmount: 0
        }] 
      });
    }

    const paidBillIds = paidBills.map(bill => bill.id);

    // Get product quantities and include price calculation from the database
    const salesDetails = await BillSaleDetailModel.findAll({
      attributes: [
        'productId',
        [sequelize.fn('SUM', sequelize.col('qty')), 'totalQty'],
        [sequelize.fn('SUM', sequelize.literal('qty * "billSaleDetail"."price"')), 'totalAmount']
      ],
      group: ['productId'], // รวมข้อมูลตาม productId เท่านั้น
      where: { 
        userId: userId,
        billSaleId: {
          [sequelize.Op.in]: paidBillIds
        }
      },
      raw: true,
      
    });

    const results = salesDetails.map(item => {
      const product = productMap.get(item.productId);
      const totalQty = parseInt(item.totalQty || 0);
      let totalAmount = parseFloat(item.totalAmount || 0);
      
      const productName = product ? product.name : 'สินค้าไม่มีชื่อ';
      
      if (isNaN(totalAmount) || totalAmount === 0) {
        const price = product ? product.price : 0;
        totalAmount = totalQty * price;
      }
      
      return {
        productId: item.productId,
        productName: productName,
        totalQty: totalQty,
        totalAmount: totalAmount > 0 ? totalAmount : 1 
      };
    });

    results.sort((a, b) => b.totalQty - a.totalQty);
    
    // Take top 5 or use default if empty
    const topResults = results.length > 0 ? results.slice(0, 5) : [{
      productId: 0,
      productName: 'ไม่มีข้อมูลการขาย',
      totalQty: 0,
      totalAmount: 0
    }];
    
    res.send({ message: 'success', results: topResults });
  } catch (error) {
    console.error('Error in reportTopSellingProducts:', error);
    // Return default data in case of error
    res.send({ 
      message: 'success', 
      results: [{
        productId: 0,
        productName: 'เกิดข้อผิดพลาด',
        totalQty: 0,
        totalAmount: 0
      }] 
    });
  }
});

router.get('/reportTopSellingCategories', async (req, res) => {
  try {
    const userId = service.getMemberId(req); 
    // ใช้เวลาไทยปัจจุบันโดยตรง
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

   
    const topSellingCategories = await BillSaleDetailModel.findAll({
      attributes: [
        [sequelize.col('product.category'), 'category'],
        [sequelize.fn('SUM', sequelize.col('qty')), 'totalQty'],
        [sequelize.fn('SUM', 
          sequelize.literal('qty * "billSaleDetail"."price"') 
        ), 'totalAmount']
      ],
      include: [{ 
        model: ProductModel, 
        as: 'product',
        attributes: ['category'], 
        required: true 
      },
      {
        model: BillSaleModel,
        as: 'billSale',
        attributes: [],
        where: { 
          status: 'pay',
          userId: userId,
          [sequelize.Op.and]: [
            sequelize.where(
              sequelize.fn('DATE', 
                sequelize.fn('TIMEZONE', 'Asia/Bangkok', 
                  sequelize.fn('TIMEZONE', 'UTC', sequelize.col('billSale.payDate'))
                )
              ), 
              sequelize.fn('DATE', today)
            )
          ]
        },
        required: true 
      }],
      group: ['product.id', 'product.category'],
      having: sequelize.literal('SUM(qty) > 0'),
      order: [[sequelize.fn('SUM', sequelize.col('qty')), 'DESC']], 
      limit: 5
    });

    const results = topSellingCategories.map(category => {
      const data = category.get({ plain: true });
      return {
        category: data.category || 'ไม่ระบุหมวดหมู่',
        totalAmount: parseFloat(data.totalAmount) || 0,
        totalQty: parseInt(data.totalQty) || 0
      };
    });

    const totalAmount = results.reduce((sum, category) => 
      sum + parseFloat(category.totalAmount || 0), 0);

    const categoriesWithPercentage = results.map(category => ({
      ...category,
      percentage: totalAmount > 0 ? 
        ((parseFloat(category.totalAmount || 0) / totalAmount) * 100).toFixed(2) : 0
    }));

    res.send({ 
      message: 'success', 
      results: categoriesWithPercentage 
    });
  } catch (error) {
    console.error('Error in reportTopSellingCategories:', error);
    res.status(500).send({ message: error.message });
  }
});

router.get('/reportTopSellingCategoriesRaw', async (req, res) => {
  try {
    const userId = service.getMemberId(req); 
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { sequelize } = require('../models');
    
    const [results] = await sequelize.query(`
      SELECT 
        p.category,
        SUM(bsd.qty) as totalQty,
        SUM(bsd.qty * bsd.price) as totalAmount
      FROM billSaleDetails bsd
      INNER JOIN products p ON bsd.productId = p.id
      INNER JOIN billSales bs ON bsd.billSaleId = bs.id
      WHERE bs.userId = :userId 
        AND bs.status = 'pay'
        AND bs.payDate >= :startDate 
        AND bs.payDate < :endDate
      GROUP BY p.category
      HAVING SUM(bsd.qty) > 0
      ORDER BY totalQty DESC
      LIMIT 5
    `, {
      replacements: {
        userId: userId,
        startDate: today,
        endDate: tomorrow
      }
    });

    // คำนวณ total amount รวมทั้งหมด
    const totalAmount = results.reduce((sum, category) => 
      sum + parseFloat(category.totalAmount || 0), 0);

    const categoriesWithPercentage = results.map(category => ({
      category: category.category || 'ไม่ระบุหมวดหมู่',
      totalAmount: parseFloat(category.totalAmount) || 0,
      totalQty: parseInt(category.totalQty) || 0,
      percentage: totalAmount > 0 ? 
        ((parseFloat(category.totalAmount || 0) / totalAmount) * 100).toFixed(2) : 0
    }));

    res.send({ 
      message: 'success', 
      results: categoriesWithPercentage 
    });
  } catch (error) {
    console.error('Error in reportTopSellingCategoriesRaw:', error);
    res.status(500).send({ message: error.message });
  }
});

router.get('/reportTodaySales', async (req, res) => {
  try {
    const userId = service.getMemberId(req);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySales = await BillSaleModel.findAll({
      where: {
        userId: userId,
        payDate: { 
          [sequelize.Op.gte]: today,
          [sequelize.Op.lt]: tomorrow
        },
        status: 'pay' 
      },
      include: [{
        model: BillSaleDetailModel,
        as: 'details',
        include: [{
          model: ProductModel,
          as: 'product'
        }]
      }]
    });

    // Calculate metrics
    const totalAmount = todaySales.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);
    const billCount = todaySales.length;
    const averagePerBill = billCount > 0 ? totalAmount / billCount : 0;

    // Calculate hourly sales
    const hourlyData = Array(24).fill().map((_, hour) => ({
      hour,
      amount: 0
    }));

    todaySales.forEach(bill => {
      const hour = new Date(bill.payDate).getHours(); 
      hourlyData[hour].amount += parseFloat(bill.totalAmount || 0);
    });

    
    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    res.send({
      message: 'success',
      results: {
        date: today,
        totalAmount,
        billCount,
        averagePerBill,
        hourlyData,
        topProducts
      }
    });

  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

router.get('/todaySalesReport', async (req, res) => {
  try {
    const userId = service.getMemberId(req);
    console.log('=== TODAY SALES REPORT GET DEBUG ===');
    console.log('User ID:', userId);
    
    // ใช้เวลาไทยปัจจุบันโดยตรง (UTC+7)
    const now = new Date();
    
    // สร้างวันที่ในไทยโดยใช้ toLocaleString แทน
    const thaiDateStr = now.toLocaleString("en-CA", {timeZone: "Asia/Bangkok"}).split(',')[0]; // รูปแบบ YYYY-MM-DD
    
    console.log('Now UTC:', now);
    console.log('Thai date string:', thaiDateStr);
    console.log('Searching for date:', thaiDateStr);

    // First, let's see what bills exist for this user in the last few days
    const allRecentBills = await BillSaleModel.findAll({
      where: {
        userId: userId,
        status: 'pay'
      },
      attributes: ['id', 'payDate', 'totalAmount'],
      order: [['payDate', 'DESC']],
      limit: 10
    });

    console.log('=== ALL RECENT BILLS FOR USER ===');
    allRecentBills.forEach(bill => {
      const thaiDate = new Date(bill.payDate).toLocaleString("en-CA", {timeZone: "Asia/Bangkok"}).split(',')[0];
      console.log(`Bill ${bill.id}: payDate=${bill.payDate}, Thai date=${thaiDate}, amount=${bill.totalAmount}`);
    });

    console.log('=== SEARCHING FOR TODAY BILLS ===');
    console.log('Query date:', thaiDateStr);
    
    // Create date range for the entire day in Thai timezone
    const startOfDay = new Date(thaiDateStr + 'T00:00:00+07:00');
    const endOfDay = new Date(thaiDateStr + 'T23:59:59+07:00');
    
    console.log('Start of day:', startOfDay);
    console.log('End of day:', endOfDay);
    
    const todaySales = await BillSaleModel.findAll({
      where: {
        userId: userId,
        status: 'pay',
        payDate: {
          [sequelize.Op.gte]: startOfDay,
          [sequelize.Op.lte]: endOfDay
        }
      },
      logging: console.log // This will show the actual SQL query
    });

    console.log('Found TODAY bills:', todaySales.length);
    if (todaySales.length > 0) {
      console.log('Today bills:', todaySales.map(bill => ({
        id: bill.id,
        payDate: bill.payDate,
        totalAmount: bill.totalAmount
      })));
    }

    // Calculate yesterday date for comparison
    const yesterday = new Date(thaiDateStr);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    console.log('Yesterday date string:', yesterdayStr);
    
    // Create date range for yesterday
    const startOfYesterday = new Date(yesterdayStr + 'T00:00:00+07:00');
    const endOfYesterday = new Date(yesterdayStr + 'T23:59:59+07:00');

    const yesterdaySales = await BillSaleModel.findAll({
      where: {
        userId: userId,
        status: 'pay',
        payDate: {
          [sequelize.Op.gte]: startOfYesterday,
          [sequelize.Op.lte]: endOfYesterday
        }
      }
    });

    const todayTotal = todaySales.reduce((sum, bill) => sum + parseFloat(bill.totalAmount || 0), 0);
    const yesterdayTotal = yesterdaySales.reduce((sum, bill) => sum + parseFloat(bill.totalAmount || 0), 0);
    
    const todayBillCount = todaySales.length;
    const yesterdayBillCount = yesterdaySales.length;
    const todayAveragePerBill = todayBillCount > 0 ? todayTotal / todayBillCount : 0;
    const yesterdayAveragePerBill = yesterdayBillCount > 0 ? yesterdayTotal / yesterdayBillCount : 0;

    const growthRate = yesterdayTotal ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100 : 0;
    const billCountGrowth = yesterdayBillCount ? ((todayBillCount - yesterdayBillCount) / yesterdayBillCount) * 100 : 0;
    const averageGrowth = yesterdayAveragePerBill ? ((todayAveragePerBill - yesterdayAveragePerBill) / yesterdayAveragePerBill) * 100 : 0;

    const hourlyData = Array(24).fill().map((_, hour) => ({
      hour,
      amount: 0
    }));

    todaySales.forEach(bill => {
      const hour = new Date(bill.payDate).getHours();
      hourlyData[hour].amount += parseFloat(bill.totalAmount || 0);
    });

    const response = {
      message: 'success',
      results: {
        date: thaiDateStr,
        totalAmount: todayTotal,
        billCount: todayBillCount,
        yesterdayBillCount: yesterdayBillCount,
        billCountGrowth: parseFloat(billCountGrowth.toFixed(2)),
        averagePerBill: todayAveragePerBill,
        yesterdayAveragePerBill: yesterdayAveragePerBill,
        averageGrowth: parseFloat(averageGrowth.toFixed(2)),
        hourlyData: hourlyData,
        growthRate: parseFloat(growthRate.toFixed(2)),
        yesterdayTotal
      }
    };

    res.send(response);

  } catch (error) {
    console.error('Error in todaySalesReport:', error);
    res.status(500).send({ 
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน',
      error: error.message 
    });
  }
});

// POST version for custom date
router.post('/todaySalesReport', async (req, res) => {
  try {
    const userId = service.getMemberId(req);
    const { date } = req.body;
    
    console.log('=== TODAY SALES REPORT DEBUG ===');
    console.log('User ID:', userId);
    console.log('Date param:', date);
    
    let targetDate;
    if (date) {
      targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
    } else {
      // ใช้เวลาไทยปัจจุบัน (UTC+7)
      const now = new Date();
      
      // สร้างวันที่ในไทยโดยใช้ toLocaleString แทน
      const thaiDateStr = now.toLocaleString("en-CA", {timeZone: "Asia/Bangkok"}).split(',')[0]; // รูปแบบ YYYY-MM-DD
      targetDate = new Date(thaiDateStr + 'T00:00:00.000Z');
      console.log('Thai date string:', thaiDateStr);
      console.log('Target date (Thai timezone):', targetDate);
    }
    
    const previousDay = new Date(targetDate);
    previousDay.setDate(previousDay.getDate() - 1);

    const targetSales = await BillSaleModel.findAll({
      where: {
        userId: userId,
        status: 'pay',
        [sequelize.Op.and]: [
          sequelize.where(
            sequelize.fn('DATE', 
              sequelize.fn('TIMEZONE', 'Asia/Bangkok', 
                sequelize.fn('TIMEZONE', 'UTC', sequelize.col('payDate'))
              )
            ), 
            sequelize.fn('DATE', targetDate)
          )
        ]
      }
    });

    console.log('Found bills for target date:', targetSales.length);
    console.log('Bills:', targetSales.map(bill => ({
      id: bill.id,
      payDate: bill.payDate,
      totalAmount: bill.totalAmount
    })));

    const previousSales = await BillSaleModel.findAll({
      where: {
        userId: userId,
        status: 'pay',
        [sequelize.Op.and]: [
          sequelize.where(
            sequelize.fn('DATE', 
              sequelize.fn('TIMEZONE', 'Asia/Bangkok', 
                sequelize.fn('TIMEZONE', 'UTC', sequelize.col('payDate'))
              )
            ), 
            sequelize.fn('DATE', previousDay)
          )
        ]
      }
    });

    const targetTotal = targetSales.reduce((sum, bill) => sum + parseFloat(bill.totalAmount || 0), 0);
    const previousTotal = previousSales.reduce((sum, bill) => sum + parseFloat(bill.totalAmount || 0), 0);
    
    const targetBillCount = targetSales.length;
    const previousBillCount = previousSales.length;
    const targetAveragePerBill = targetBillCount > 0 ? targetTotal / targetBillCount : 0;
    const previousAveragePerBill = previousBillCount > 0 ? previousTotal / previousBillCount : 0;

    const growthRate = previousTotal ? ((targetTotal - previousTotal) / previousTotal) * 100 : 0;
    const billCountGrowth = previousBillCount ? ((targetBillCount - previousBillCount) / previousBillCount) * 100 : 0;
    const averageGrowth = previousAveragePerBill ? ((targetAveragePerBill - previousAveragePerBill) / previousAveragePerBill) * 100 : 0;

    const hourlyData = Array(24).fill().map((_, hour) => ({
      hour,
      amount: 0
    }));

    targetSales.forEach(bill => {
      const hour = new Date(bill.payDate).getHours();
      hourlyData[hour].amount += parseFloat(bill.totalAmount || 0);
    });

    const response = {
      message: 'success',
      results: {
        date: targetDate,
        totalAmount: targetTotal,
        billCount: targetBillCount,
        yesterdayBillCount: previousBillCount,
        billCountGrowth: parseFloat(billCountGrowth.toFixed(2)),
        averagePerBill: targetAveragePerBill,
        yesterdayAveragePerBill: previousAveragePerBill,
        averageGrowth: parseFloat(averageGrowth.toFixed(2)),
        hourlyData: hourlyData,
        growthRate: parseFloat(growthRate.toFixed(2)),
        yesterdayTotal: previousTotal
      }
    };

    res.send(response);

  } catch (error) {
    console.error('Error in todaySalesReport POST:', error);
    res.status(500).send({ 
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน',
      error: error.message 
    });
  }
});

router.get('/yesterdaySalesReport', async (req, res) => {
  try {
    const userId = service.getMemberId(req);
    // ใช้เวลาไทยปัจจุบันโดยตรง
    const now = new Date();
    
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(yesterday);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 1);

    const yesterdaySales = await BillSaleModel.findAll({
      where: {
        userId: userId,
        status: 'pay',
        [sequelize.Op.and]: [
          sequelize.where(
            sequelize.fn('DATE', 
              sequelize.fn('TIMEZONE', 'Asia/Bangkok', 
                sequelize.fn('TIMEZONE', 'UTC', sequelize.col('payDate'))
              )
            ), 
            sequelize.fn('DATE', yesterday)
          )
        ]
      }
    });

    console.log('Found YESTERDAY bills:', yesterdaySales.length);

    const twoDaysAgoSales = await BillSaleModel.findAll({
      where: {
        userId: userId,
        status: 'pay',
        [sequelize.Op.and]: [
          sequelize.where(
            sequelize.fn('DATE', 
              sequelize.fn('TIMEZONE', 'Asia/Bangkok', 
                sequelize.fn('TIMEZONE', 'UTC', sequelize.col('payDate'))
              )
            ), 
            sequelize.fn('DATE', twoDaysAgo)
          )
        ]
      }
    });

    const yesterdayTotal = yesterdaySales.reduce((sum, bill) => sum + parseFloat(bill.totalAmount || 0), 0);
    const twoDaysAgoTotal = twoDaysAgoSales.reduce((sum, bill) => sum + parseFloat(bill.totalAmount || 0), 0);
    
    const yesterdayBillCount = yesterdaySales.length;
    const twoDaysAgoBillCount = twoDaysAgoSales.length;
    const yesterdayAveragePerBill = yesterdayBillCount > 0 ? yesterdayTotal / yesterdayBillCount : 0;
    const twoDaysAgoAveragePerBill = twoDaysAgoBillCount > 0 ? twoDaysAgoTotal / twoDaysAgoBillCount : 0;

    const growthRate = twoDaysAgoTotal ? ((yesterdayTotal - twoDaysAgoTotal) / twoDaysAgoTotal) * 100 : 0;
    const billCountGrowth = twoDaysAgoBillCount ? ((yesterdayBillCount - twoDaysAgoBillCount) / twoDaysAgoBillCount) * 100 : 0;
    const averageGrowth = twoDaysAgoAveragePerBill ? ((yesterdayAveragePerBill - twoDaysAgoAveragePerBill) / twoDaysAgoAveragePerBill) * 100 : 0;

    const hourlyData = Array(24).fill().map((_, hour) => ({
      hour,
      amount: 0
    }));

    yesterdaySales.forEach(bill => {
      const hour = new Date(bill.payDate).getHours();
      hourlyData[hour].amount += parseFloat(bill.totalAmount || 0);
    });

    const response = {
      message: 'success',
      results: {
        date: yesterday,
        totalAmount: yesterdayTotal,
        billCount: yesterdayBillCount,
        yesterdayBillCount: twoDaysAgoBillCount,
        billCountGrowth: parseFloat(billCountGrowth.toFixed(2)),
        averagePerBill: yesterdayAveragePerBill,
        yesterdayAveragePerBill: twoDaysAgoAveragePerBill,
        averageGrowth: parseFloat(averageGrowth.toFixed(2)),
        hourlyData: hourlyData,
        growthRate: parseFloat(growthRate.toFixed(2)),
        yesterdayTotal: twoDaysAgoTotal
      }
    };

    res.send(response);

  } catch (error) {
    console.error('Error in yesterdaySalesReport:', error);
    res.status(500).send({ 
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายงานเมื่อวาน',
      error: error.message 
    });
  }
});

router.get('/paymentMethodStats', async (req, res) => {
  try {
    const userId = service.getMemberId(req);
    // ใช้เวลาไทยปัจจุบันโดยตรง
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const paymentStats = await BillSaleModel.findAll({
      attributes: [
        'paymentMethod',
        [sequelize.fn('COUNT', sequelize.col('billSale.id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'total']
      ],
      where: {
        userId: userId,
        status: 'pay',
        [sequelize.Op.and]: [
          sequelize.where(
            sequelize.fn('DATE', 
              sequelize.fn('TIMEZONE', 'Asia/Bangkok', 
                sequelize.fn('TIMEZONE', 'UTC', sequelize.col('payDate'))
              )
            ), 
            sequelize.fn('DATE', today)
          )
        ]
      },
      group: ['paymentMethod'],
      raw: true
    });

   

    res.send({ 
      message: 'success', 
      results: paymentStats.map(stat => ({
        ...stat,
        paymentMethod: stat.paymentMethod || 'ไม่ระบุ', 
        total: parseFloat(stat.total) || 0,
        label: '' 
      }))
    });
  } catch (error) {
    
    res.status(500).send({ message: error.message });
  }
});

router.post('/reportSalesByDateRange', async (req, res) => {
  try {
    const userId = service.getMemberId(req);
    const { dateRange, customStartDate, customEndDate } = req.body;
    
    
    let startDate, endDate;
    const now = new Date();
    
    if (dateRange === 'custom') {
      if (!customStartDate || !customEndDate) {
        return res.send({
          message: 'success',
          results: []
        });
      }
      
      startDate = new Date(customStartDate + 'T00:00:00.000');
      endDate = new Date(customEndDate + 'T23:59:59.999');
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.send({
          message: 'success',
          results: []
        });
      }
    } else {
      const today = new Date();
      const thaiToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      switch (dateRange) {
        case 'today':
          startDate = new Date(thaiToday);
          endDate = new Date(thaiToday);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'yesterday':
          startDate = new Date(thaiToday);
          startDate.setDate(startDate.getDate() - 1);
          endDate = new Date(startDate);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'last7days':
          startDate = new Date(thaiToday);
          startDate.setDate(startDate.getDate() - 6);
          endDate = new Date(thaiToday);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'last30days':
        case 'thisMonth':
          if (dateRange === 'last30days') {
            startDate = new Date(thaiToday);
            startDate.setDate(startDate.getDate() - 29);
          } else {
            startDate = new Date(thaiToday.getFullYear(), thaiToday.getMonth(), 1);
          }
          endDate = new Date(thaiToday);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'lastMonth':
          startDate = new Date(thaiToday.getFullYear(), thaiToday.getMonth() - 1, 1);
          endDate = new Date(thaiToday.getFullYear(), thaiToday.getMonth(), 0, 23, 59, 59, 999);
          break;
        default:
          startDate = new Date(thaiToday);
          endDate = new Date(thaiToday);
          endDate.setHours(23, 59, 59, 999);
      }
    }
    
   
    
    const results = await BillSaleDetailModel.findAll({
      attributes: [
        'productId',
        [sequelize.col('product.name'), 'productName'],
        [sequelize.fn('SUM', sequelize.col('qty')), 'quantity'],
        [sequelize.fn('SUM', sequelize.literal('qty * totalprice')), 'totalAmount'],
        [sequelize.col('product.cost'), 'costPerUnit'],
        [sequelize.col('product.price'), 'pricePerUnit'],
        [sequelize.fn('SUM', 
          sequelize.literal('(totalprice - product.cost) * qty')
        ), 'netProfit']
      ],
      include: [{
        model: ProductModel,
        as: 'product',
        attributes: []
      }],
      where: {
        userId,
        createdAt: {
          [sequelize.Op.between]: [startDate, endDate]
        }
      },
      group: [
        'productId',
        'product.name',
        'product.cost',
        'product.price'
      ],
      order: [['productId', 'ASC']],
      raw: true
    });

    res.send({
      message: 'success',
      results: results.map(item => ({
        ...item,
        quantity: parseInt(item.quantity) || 0,
        totalAmount: parseFloat(item.totalAmount) || 0,
        costPerUnit: parseFloat(item.costPerUnit) || 0,
        pricePerUnit: parseFloat(item.pricePerUnit) || 0,
        netProfit: parseFloat(item.netProfit) || 0
      }))
    });
    
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

router.post('/productDetails', async (req, res) => {
  try {
    const userId = service.getMemberId(req);
    const { startDate, endDate, dateRange } = req.body;
    
    

    let start, end;
    
    if (startDate && endDate) {

      start = new Date(startDate + 'T00:00:00.000');
      end = new Date(endDate + 'T23:59:59.999');
    } else {

      const today = new Date();
      const thaiToday = new Date(today.getTime() + (7 * 60 * 60 * 1000)); // เวลาไทยปัจจุบัน
      thaiToday.setHours(0, 0, 0, 0);
      
      start = new Date(thaiToday);
      end = new Date(thaiToday);
      end.setHours(23, 59, 59, 999);
    }
    
   


    const results = await BillSaleDetailModel.findAll({
      attributes: [
        [sequelize.literal('DATE("billSaleDetail"."createdAt")'), 'saleDate'],
        [sequelize.fn('SUM', sequelize.literal('qty * "billSaleDetail"."price"')), 'totalAmount'],
        [sequelize.fn('SUM', sequelize.col('qty')), 'totalQuantity'],
        [sequelize.fn('SUM', sequelize.literal('("billSaleDetail"."price" - "product"."cost") * qty')), 'netProfit'],
        [sequelize.fn('AVG', sequelize.col('product.cost')), 'avgCost'],
        [sequelize.fn('AVG', sequelize.col('product.price')), 'avgPrice']
      ],
      include: [{
        model: ProductModel,
        as: 'product',
        attributes: [],
        required: true
      }, {
        model: BillSaleModel,
        as: 'billSale',
        attributes: [],
        where: {
          status: 'pay' 
        }
      }],
      where: { 
        userId,
        createdAt: {
          [sequelize.Op.between]: [start, end]
        }
      },
      group: [
        sequelize.literal('DATE("billSaleDetail"."createdAt")')
      ],
      order: [
        [sequelize.literal('DATE("billSaleDetail"."createdAt")'), 'ASC']
      ],
      raw: true
    });

    // แปลงข้อมูลให้อยู่ในรูปแบบที่ต้องการใช้งาน
    const processedResults = results.map(item => ({
      saleDate: item.saleDate,
      totalAmount: parseFloat(item.totalAmount) || 0,
      totalQuantity: parseInt(item.totalQuantity) || 0,
      netProfit: parseFloat(item.netProfit) || 0,
      avgCost: parseFloat(item.avgCost) || 0,
      avgPrice: parseFloat(item.avgPrice) || 0
    }));

    res.send({
      message: 'success',
      results: processedResults
    });

  } catch (error) {
    console.error('Error in productDetails:', error);
    res.status(500).send({ message: error.message });
  }
});

router.get('/productDetails', async (req, res) => {
  try {
    const userId = service.getMemberId(req);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const results = await BillSaleDetailModel.findAll({
      attributes: [
        'productId',
        [sequelize.col('product.name'), 'productName'],
        [sequelize.fn('SUM', sequelize.col('qty')), 'quantity'],
        [sequelize.fn('SUM', sequelize.literal('qty * totalprice')), 'totalAmount'],
        [sequelize.col('product.cost'), 'costPerUnit'],
        [sequelize.col('product.price'), 'pricePerUnit'],
        [sequelize.fn('SUM', 
          sequelize.literal('(totalprice - product.cost) * qty')
        ), 'netProfit'],
        [sequelize.literal('DATE("billSaleDetail"."createdAt")'), 'saleDate']
      ],
      include: [{
        model: ProductModel,
        as: 'product',
        attributes: []
      }],
      where: { 
        userId,
        createdAt: {
          [sequelize.Op.gte]: today,
          [sequelize.Op.lt]: tomorrow
        }
      },
      group: [
        'productId', 
        'product.name', 
        'product.cost', 
        'product.price',
        sequelize.literal('DATE("billSaleDetail"."createdAt")')
      ],
      order: [
        [sequelize.literal('DATE("billSaleDetail"."createdAt")'), 'ASC'],
        ['productId', 'ASC']
      ],
      raw: true
    });

    res.send({
      message: 'success',
      results: results.map(item => ({
        ...item,
        quantity: parseInt(item.quantity) || 0,
        totalAmount: parseFloat(item.totalAmount) || 0,
        costPerUnit: parseFloat(item.costPerUnit) || 0,
        pricePerUnit: parseFloat(item.pricePerUnit) || 0,
        netProfit: parseFloat(item.netProfit) || 0
      }))
    });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

router.post('/reportTopSalesDays', async (req, res) => {
  try {
    const userId = service.getMemberId(req);
    const { startDate, endDate } = req.body;
    
    
    let start, end;
    
    if (startDate && endDate) {
      start = new Date(startDate + 'T00:00:00.000');
      end = new Date(endDate + 'T23:59:59.999');
    } else {
      const today = new Date();
      const thaiToday = new Date(today.getTime() + (7 * 60 * 60 * 1000)); // เวลาไทยปัจจุบัน
      thaiToday.setHours(23, 59, 59, 999);
      end = new Date(thaiToday);
      
      const thai30DaysAgo = new Date(thaiToday);
      thai30DaysAgo.setDate(thai30DaysAgo.getDate() - 29);
      thai30DaysAgo.setHours(0, 0, 0, 0);
      start = new Date(thai30DaysAgo);
    }
    
 

    const results = await BillSaleDetailModel.findAll({
      attributes: [
        [sequelize.fn('DATE', 
          sequelize.fn('TIMEZONE', 'Asia/Bangkok', 
            sequelize.fn('TIMEZONE', 'UTC', sequelize.col('billSaleDetail.createdAt'))
          )
        ), 'date'],
        [sequelize.fn('SUM', 
          sequelize.literal('(totalprice - product.cost) * qty')
        ), 'netProfit']
      ],
      include: [{
        model: ProductModel,
        as: 'product',
        attributes: [],
        required: true
      }],
      where: {
        userId,
        createdAt: {
          [sequelize.Op.between]: [start, end]
        }
      },
      group: [sequelize.fn('DATE', 
        sequelize.fn('TIMEZONE', 'Asia/Bangkok', 
          sequelize.fn('TIMEZONE', 'UTC', sequelize.col('billSaleDetail.createdAt'))
        )
      )],
      having: sequelize.literal('SUM((totalprice - product.cost) * qty) > 0'),
      order: [[sequelize.fn('SUM', 
        sequelize.literal('(totalprice - product.cost) * qty')
      ), 'DESC']],
      limit: 5,
      raw: true
    });

    // ส่งเฉพาะผลลัพธ์ 5 อันดับแรก 
    res.send({
      message: 'success',
      results: results.map(item => ({
        date: item.date,
        netProfit: parseFloat(item.netProfit) || 0
      }))
    });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

router.post('/stock/combinedReport', async (req, res) => {
  try {
    const userId = service.getMemberId(req);
    const { startDate, endDate } = req.body;
    
    const start = new Date(startDate);
    const end = new Date(endDate);

    const results = await BillSaleDetailModel.findAll({
      attributes: [
        'productId',
        [sequelize.fn('SUM', sequelize.col('qty')), 'soldQty'],
        [sequelize.fn('SUM', sequelize.literal('"billSaleDetail"."price" * qty')), 'totalAmount'],
        [sequelize.fn('SUM', sequelize.literal('("billSaleDetail"."price" - "product"."cost") * qty')), 'netProfit']
      ],
      include: [{
        model: ProductModel,
        as: 'product',
        attributes: ['name', 'barcode', 'cost', 'price']
      }, {
        model: BillSaleModel,
        as: 'billSale',
        attributes: [],
        where: {
          userId,
          payDate: { [sequelize.Op.between]: [start, end] }, // ใช้ payDate แทน createdAt
          status: 'pay'
        }
      }],
      group: ['productId', 'product.id', 'product.name', 'product.barcode', 'product.cost', 'product.price'],
      raw: true
    });

    res.send({
      message: 'success',
      results: results.map(item => ({
        productId: item.productId,
        name: item['product.name'] || 'ไม่ระบุชื่อ',
        barcode: item['product.barcode'] || '-',
        soldQty: parseInt(item.soldQty) || 0,
        cost: parseFloat(item['product.cost']) || 0,
        price: parseFloat(item['product.price']) || 0,
        totalAmount: parseFloat(item.totalAmount) || 0,
        netProfit: parseFloat(item.netProfit) || 0
      }))
    });
  } catch (error) {
    console.error('Error in combined stock report:', error);
    res.status(500).send({ message: error.message });
  }
});

module.exports = router;