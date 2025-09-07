const conn = require ('../connect');
const { DataTypes } = require("sequelize");

const Defer_paymentModel = conn.define("Defer_payment", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    billSaleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'รหัสอ้างอิงบิล',
        references: null  // ไม่ให้สร้าง foreign key constraint
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'รหัสผู้ใช้'
    },
    totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'ยอดรวมของบิล'
    },
    heldAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'วันเวลาที่พักบิล'
    },
    status: {
        type: DataTypes.ENUM('held', 'retrieved', 'cancelled'),
        allowNull: false,
        defaultValue: 'held',
    }
}, {
    indexes: [
        {
            fields: ['billSaleId']  // สร้าง index แต่ไม่สร้าง foreign key
        },
        {
            fields: ['userId', 'status']
        }
    ]
});

// Defer_paymentModel.sync({alter: true});
module.exports = Defer_paymentModel;
