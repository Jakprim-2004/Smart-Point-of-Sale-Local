const conn = require('../connect');
const { DataTypes } = require('sequelize');

const MemberModel = conn.define('member', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    email: {
        type: DataTypes.STRING(100)
    },
    firstName: {
        type: DataTypes.STRING(50)
    },
    lastName: {
        type: DataTypes.STRING(50)
    },
    phone: {
        type: DataTypes.STRING(15)
    },
    pass: {
        type: DataTypes.STRING(100)
    },
    
})

// MemberModel.sync({alter: true});
module.exports = MemberModel;