const conn = require('../connect');
const { DataTypes } = require('sequelize');

const MemberModel = conn.define('member', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    email: {
        type: DataTypes.STRING(255)
    },
    firstName: {
        type: DataTypes.STRING(255)
    },
    lastName: {
        type: DataTypes.STRING(255)
    },
    phone: {
        type: DataTypes.STRING(255)
    },
    pass: {
        type: DataTypes.STRING(255)
    },
    
})

// MemberModel.sync({alter: true});
module.exports = MemberModel;