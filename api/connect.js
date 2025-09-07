const { Sequelize } = require('sequelize');
require('dotenv').config();

// ใช้การตั้งค่าสำหรับ local PostgreSQL database
const sequelize = new Sequelize(
    process.env.DB_NAME || 'smartpos',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || '6540200349',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'postgres',
        logging: false, // เปลี่ยนเป็น console.log หากต้องการดู SQL queries
        port: parseInt(process.env.DB_PORT || '5432'),
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        retry: {
            max: 3
        }
    }
);

// Test the connection
sequelize.authenticate()
    .then(() => console.log('Local PostgreSQL Database connected successfully'))
    .catch(err => console.error('Unable to connect to the database:', err));

module.exports = sequelize;



