const conn = require('../connect');
const { DataTypes } = require('sequelize');
const ProductModel = conn.define('product', {
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
    },
    barcode: {
        type: DataTypes.STRING(20)
    },
    name: {
        type: DataTypes.STRING(100)
    },
    cost: {
        type: DataTypes.DECIMAL(10,2)
    },
    price: {
        type: DataTypes.DECIMAL(10,2)
    },
    userId: {
        type: DataTypes.BIGINT
    },
    category: {
        type: DataTypes.BIGINT
    },
    units_of_measure: {
        type: DataTypes.STRING
    }
})

// ProductModel.sync({ alter: true });

module.exports = ProductModel;