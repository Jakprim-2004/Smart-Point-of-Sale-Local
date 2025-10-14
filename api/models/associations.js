const ProductModel = require('./ProductModel');
const StockModel = require('./StockModel');
const BillSaleDetailModel = require('./BillSaleDetailModel'); 
const BillSaleModel = require('./BillSaleModel');
const CustomerModel = require('./CustomerModel');
const PointTransactionModel = require('./PointTransactionModel');
const Defer_paymentModel = require('./Defer_paymentModel');
const MemberModel = require('./MemberModel');
const CategoryModel = require('./CategoryModel');
// const RefreshTokenModel = require('./RefreshTokenModel'); // ปิดการใช้งานชั่วคราว

// การเชื่อมโยงระหว่าง Product และ Category
ProductModel.belongsTo(CategoryModel, { 
    foreignKey: 'category',
    targetKey: 'id',
    as: 'categoryData',
    constraints: false
});
CategoryModel.hasMany(ProductModel, { 
    foreignKey: 'category',
    sourceKey: 'id',
    constraints: false
});

// การเชื่อมโยงระหว่าง Product และ Stock
ProductModel.hasMany(StockModel, { 
    foreignKey: 'productId',
    constraints: false 
});
StockModel.belongsTo(ProductModel, { 
    foreignKey: 'productId',
    constraints: false 
});

// การเชื่อมโยงระหว่าง Product และ BillSaleDetail
ProductModel.hasMany(BillSaleDetailModel, { 
    foreignKey: 'productId',
    sourceKey: 'id'
});
BillSaleDetailModel.belongsTo(ProductModel, { 
    foreignKey: 'productId',
    targetKey: 'id',
    as: 'product' 
});

// Add BillSale and BillSaleDetail associations 
BillSaleModel.hasMany(BillSaleDetailModel, { 
  foreignKey: 'billSaleId',
  as: 'details'
});
BillSaleDetailModel.belongsTo(BillSaleModel, { 
  foreignKey: 'billSaleId',
  as: 'billSale'
});



// Add Customer and BillSale associations
BillSaleModel.belongsTo(CustomerModel, { 
  foreignKey: 'customerId', 
  targetKey: 'id',
  constraints: false  
});
CustomerModel.hasMany(BillSaleModel, { 
  foreignKey: 'customerId',
  sourceKey: 'id',
  constraints: false 
});

// Add Customer and PointTransaction associations
CustomerModel.hasMany(PointTransactionModel, { foreignKey: 'customerId' });
PointTransactionModel.belongsTo(CustomerModel, { foreignKey: 'customerId' });

// Add Defer_payment and BillSale associations
Defer_paymentModel.belongsTo(BillSaleModel, { 
  foreignKey: 'billSaleId',
  targetKey: 'id',
  constraints: false  // ปิด foreign key constraints
});
BillSaleModel.hasMany(Defer_paymentModel, { 
  foreignKey: 'billSaleId',
  sourceKey: 'id',
  constraints: false  // ปิด foreign key constraints
});

// Add Member and RefreshToken associations (ปิดการใช้งานชั่วคราว)
// MemberModel.hasMany(RefreshTokenModel, { 
//   foreignKey: 'userId',
//   sourceKey: 'id',
//   onDelete: 'CASCADE' // ลบ member แล้วลบ refresh tokens ด้วย
// });
// RefreshTokenModel.belongsTo(MemberModel, { 
//   foreignKey: 'userId',
//   targetKey: 'id'
// });

