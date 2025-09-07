const conn = require("../connect");
const { DataTypes } = require("sequelize");
const CustomerModel = require("./CustomerModel");

const BillSaleDetailModel = conn.define("billSaleDetail", {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  },
  billSaleId: {
    type: DataTypes.BIGINT,
  },
  productId: {
    type: DataTypes.BIGINT,
  },
  qty: {
    type: DataTypes.BIGINT,
  },
  price: {
    type: DataTypes.BIGINT,
  },
  userId: {
    type: DataTypes.BIGINT,
  },
  totalprice: {
    type: DataTypes.DECIMAL(10, 2),
  },
  customerId: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  pointsEarned: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: 'billSaleDetail',
  freezeTableName: true,
});

// hook สำหรับคำนวณแต้มอัตโนมัติ
BillSaleDetailModel.addHook('afterCreate', async (billDetail) => {
  if (billDetail.customerId) {
    const customer = await CustomerModel.findByPk(billDetail.customerId);
    if (customer) {
      const pointsEarned = customer.calculatePoints(billDetail.totalprice);
      customer.points += pointsEarned;
      customer.totalSpent += billDetail.totalprice;
      customer.lastPurchaseDate = new Date();
      customer.updateMembershipTier();
      await customer.save();
    }
  }
});

module.exports = BillSaleDetailModel;
