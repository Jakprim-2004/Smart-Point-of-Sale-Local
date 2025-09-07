const conn = require('../connect');
const { DataTypes } = require('sequelize');
const CategoryModel = conn.define('Category', {
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
    },
    name: {  
        type: DataTypes.STRING,
        allowNull: false
    },
    
    userId: {
        type: DataTypes.BIGINT,
        allowNull: false
    }
})

// CategoryModel.sync({ alter: true });

module.exports = CategoryModel;