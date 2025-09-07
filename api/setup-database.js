const sequelize = require('./connect');

// Import all models
const BillSaleModel = require('./models/BillSaleModel');
const BillSaleDetailModel = require('./models/BillSaleDetailModel');
const CategoryModel = require('./models/CategoryModel');
const CustomerModel = require('./models/CustomerModel');
const DeferPaymentModel = require('./models/Defer_paymentModel');
const MemberModel = require('./models/MemberModel');
const PointTransactionModel = require('./models/PointTransactionModel');
const ProductModel = require('./models/ProductModel');
const ProductImageModel = require('./models/ProductImageModel');
const RewardModel = require('./models/RewardModel');
const StockModel = require('./models/StockModel');

// Import associations
require('./models/associations');

async function setupDatabase() {
    try {
        console.log('Setting up database...');
        
        // Test connection
        await sequelize.authenticate();
        console.log('✅ Database connection successful');
        
        // สร้างตารางใหม่หมด
        await sequelize.sync({ force: true });
        console.log('✅ All tables created successfully');
        
        // แสดงรายชื่อตาราง
        const [results] = await sequelize.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);
        
        console.log('📋 Created tables:');
        results.forEach(row => {
            console.log(`- ${row.table_name}`);
        });
        
        console.log('🎉 Database setup completed!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

// Run setup
if (require.main === module) {
    setupDatabase().then(() => {
        process.exit(0);
    }).catch((error) => {
        console.error('Setup failed:', error.message);
        process.exit(1);
    });
}

module.exports = setupDatabase;
