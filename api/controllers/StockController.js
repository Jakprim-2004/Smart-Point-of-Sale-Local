const express = require('express');
const app = express();
app.disable('x-powered-by');
const Service = require('./Service');
const StockModel = require('../models/StockModel');
const { Sequelize } = require('sequelize'); // Add this import

app.post('/stock/save', Service.isLogin, async (req, res) => {
    try {
        let payload = {
            qty: req.body.qty,
            productId: req.body.productId,
            userId: Service.getMemberId(req)
        }

        await StockModel.create(payload);

        res.send({ message: 'success' });
    } catch (e) {
        res.statusCode = 500;
        res.send({ message: e.message });
    }
})

app.get('/stock/list', Service.isLogin, async (req, res) => {
    try {
        const ProductModel = require('../models/ProductModel');
        const CategoryModel = require('../models/CategoryModel');
        
        const results = await StockModel.findAll({
            where: {
                userId: Service.getMemberId(req)
            },
            order: [['id', 'DESC']],
            include: {
                model: ProductModel,
                include: [{
                    model: CategoryModel,
                    as: 'categoryData',
                    required: false
                }]
            }
        })

        // แปลงข้อมูลเพื่อเพิ่มชื่อหมวดหมู่
        const resultsWithCategory = results.map(stock => {
            const stockData = stock.toJSON();
            if (stockData.product && stockData.product.categoryData) {
                stockData.product.category = stockData.product.categoryData.name;
            }
            return stockData;
        });

        res.send({ message: 'success', results: resultsWithCategory });
    } catch (e) {
        res.statusCode = 500;
        res.send({ message: e.message });
    }
})

app.delete('/stock/delete/:id', Service.isLogin, async (req, res) => {
    try {
        await StockModel.destroy({
            where: {
                userId: Service.getMemberId(req),
                id: req.params.id
            }
        })

        res.send({ message: 'success' });
    } catch (e) {
        res.statusCode = 500;
        res.send({ message: e.message });
    }
})

app.get('/stock/report', Service.isLogin, async (req, res) => {
    try {
        const ProductModel = require('../models/ProductModel');
        const BillSaleDetailModel = require('../models/BillSaleDetailModel');
        const CategoryModel = require('../models/CategoryModel');

        // ไม่ต้องประกาศ associations ซ้ำ เพราะมีใน associations.js แล้ว
        let arr = [];
        
        // Get all products for this user
        const results = await ProductModel.findAll({
            include: [
                {
                    model: StockModel,
                    required: false // Left join - แสดงสินค้าทั้งหมดแม้ไม่มีสต๊อก
                },
                {
                    model: BillSaleDetailModel,
                    required: false // Left join - แสดงสินค้าทั้งหมดแม้ไม่มีการขาย
                },
                {
                    model: CategoryModel,
                    as: 'categoryData',
                    required: false
                }
            ],
            where: {
                userId: Service.getMemberId(req)
            }
        });


        // Calculate stock for each product
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const stocks = result.stocks || [];
            const billSaleDetails = result.billSaleDetails || [];
            const currentUserId = Service.getMemberId(req);

            let stockIn = 0; // จำนวนรับเข้า
            let stockOut = 0; // จำนวนขายออก

            // Sum stock in - กรองเฉพาะข้อมูลของ user ปัจจุบัน
            for (let j = 0; j < stocks.length; j++) {
                const item = stocks[j];
                if (item.userId === currentUserId) {
                    stockIn += parseInt(item.qty) || 0;
                }
            }

            // Sum stock out (sold) - กรองเฉพาะข้อมูลของ user ปัจจุบัน
            for (let j = 0; j < billSaleDetails.length; j++) {
                const item = billSaleDetails[j];
                if (item.userId === currentUserId) {
                    stockOut += parseInt(item.qty) || 0;
                }
            }

            const remainingStock = Math.max(0, stockIn - stockOut);
            
            // แปลงข้อมูลเป็น plain object และเพิ่มชื่อหมวดหมู่
            const resultData = result.toJSON();
            if (resultData.categoryData) {
                resultData.categoryName = resultData.categoryData.name;
            }

            arr.push({
                result: resultData, // ข้อมูลสินค้า
                stockIn: stockIn, // จำนวนรับเข้า
                stockOut: stockOut // จำนวนขายออก
            });
        }

        res.send({ message: 'success', results: arr });
    } catch (e) {
        console.error('Error in stock report:', e); // Better error logging
        res.statusCode = 500;
        res.send({ message: e.message });
    }
})

app.get('/stock/combinedReport', Service.isLogin, async (req, res) => {
    try {
        const ProductModel = require('../models/ProductModel');
        const BillSaleDetailModel = require('../models/BillSaleDetailModel');
        const sequelize = StockModel.sequelize; // Get sequelize instance from model

        // Get all stock entries
        const stockResults = await StockModel.findAll({
            attributes: [
                'productId',
                [sequelize.fn('SUM', sequelize.col('qty')), 'stockQty']
            ],
            where: {
                userId: Service.getMemberId(req)
            },
            group: ['productId', 'product.id', 'product.name', 'product.barcode', 'product.price', 'product.cost'], // Include all selected fields
            include: {
                model: ProductModel,
                attributes: ['name', 'barcode', 'price', 'cost']
            }
        });

        // Get all sales
        const salesResults = await BillSaleDetailModel.findAll({
            attributes: [
                'productId',
                [sequelize.fn('SUM', sequelize.col('qty')), 'soldQty']
            ],
            where: {
                userId: Service.getMemberId(req)
            },
            group: ['productId']
        });

        // Combine the results
        const combinedResults = stockResults.map(stock => {
            const sales = salesResults.find(sale => sale.productId === stock.productId);
            const stockQty = parseInt(stock.get('stockQty')) || 0;
            const soldQty = sales ? parseInt(sales.get('soldQty')) || 0 : 0;
            const remainingQty = Math.max(0, stockQty - soldQty);

            return {
                productId: stock.productId,
                name: stock.product.name,
                barcode: stock.product.barcode,
                price: stock.product.price,
                cost: stock.product.cost,
                stockQty: stockQty,
                soldQty: soldQty,
                remainingQty: remainingQty
            };
        });

        res.send({ message: 'success', results: combinedResults });
    } catch (e) {
        console.error('Error in combinedReport:', e); // Add better error logging
        res.status(500).send({ message: e.message });
    }
});

module.exports = app;