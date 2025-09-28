const conn = require('../connect');
const { DataTypes } = require('sequelize');
const ProductImageModel = conn.define('productImage', {
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
    },
    productId: {
        type: DataTypes.BIGINT
    },
    imageName: {
        type: DataTypes.STRING(255)
    },
    imageUrl: {
        type: DataTypes.TEXT 
    },
    isMain: {
        type: DataTypes.ENUM('TRUE', 'FALSE'),
    }
})

// ProductImageModel.sync({alter: true});

module.exports = ProductImageModel;