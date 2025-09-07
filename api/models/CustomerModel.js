const conn = require("../connect");
const { DataTypes } = require("sequelize");

const CustomerModel = conn.define("Customer", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    points: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    membershipTier: {
        type: DataTypes.STRING(20),
        defaultValue: 'NORMAL'
    },
    pointsExpireDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    totalSpent: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    // ใช้ชื่อตารางที่ถูกต้องตามที่ถูกอ้างถึง
    tableName: 'Customer',
    freezeTableName: true
});

CustomerModel.prototype.calculatePoints = function(purchaseAmount) {
    // ทุก 100 บาท = 1 แต้ม
    return Math.floor(purchaseAmount / 100);
};

CustomerModel.prototype.updateMembershipTier = function() {
    if (this.points >= 1000) this.membershipTier = 'PLATINUM';
    else if (this.points >= 500) this.membershipTier = 'GOLD';
    else if (this.points >= 100) this.membershipTier = 'SILVER';
    else if (this.points >= 10) this.membershipTier = 'Bronze';
    else this.membershipTier = 'NORMAL';
};



module.exports = CustomerModel;
