const conn = require("../connect");
const { DataTypes } = require("sequelize");
const CustomerModel = require("./CustomerModel");

const BillSaleModel = conn.define("billSale", {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  },
  payDate: {
    type: DataTypes.DATE,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: "open",
    allowNull: false,
  },
  userId: {
    type: DataTypes.BIGINT
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "", 
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  },  customerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: CustomerModel,
      key: 'id'
    }
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2)
  }
});

module.exports = BillSaleModel;