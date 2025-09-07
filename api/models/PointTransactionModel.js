const conn = require('../connect');
const { DataTypes } = require('sequelize');
const CustomerModel = require('./CustomerModel');

const PointTransactionModel = conn.define('PointTransaction', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    customerId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    points: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    transactionType: {
        type: DataTypes.ENUM('REDEEM_REWARD', 'DISCOUNT'),
        allowNull: false
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true
    },
    transactionDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
});

// กำหนดความสัมพันธ์กับ Customer model
PointTransactionModel.belongsTo(CustomerModel, {
    foreignKey: 'customerId'
});

// ลบการเรียกใช้ sync ที่นี่เพื่อป้องกันการซิงค์ซ้ำซ้อน
// PointTransactionModel.sync({alter: true});

module.exports = PointTransactionModel;
