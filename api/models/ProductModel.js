const conn = require('../connect');
const { DataTypes } = require('sequelize');
const ProductModel = conn.define('product', {
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
    },
    barcode: {
        type: DataTypes.STRING
    },
    name: {
        type: DataTypes.STRING
    },
    cost: {
        type: DataTypes.BIGINT
    },
    price: {
        type: DataTypes.BIGINT
    },
    userId: {
        type: DataTypes.BIGINT
    },
    category: {
        type: DataTypes.STRING
    },
    units_of_measure: {
        type: DataTypes.STRING
    }
})

// ProductModel.sync({ alter: true });

module.exports = ProductModel;