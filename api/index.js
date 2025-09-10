const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser');
require('dotenv').config();

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));

// Body parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Static files for uploads
app.use("/uploads", express.static("uploads"));




app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Smart POS API' });
  try {
    console.log('Root endpoint accessed');
  } catch (error) {
    console.error('Error in root endpoint:', error);
  }
});



// Import controllers
try {
  app.use(require("./controllers/MemberController"));
  app.use(require("./controllers/ProductController"));
  app.use(require("./controllers/ProductImageController"));
  app.use(require("./controllers/BillSaleController"));
  app.use(require("./controllers/StockController"));
  app.use(require("./controllers/DashboardController"));
  app.use(require('./controllers/CustomerControllers'));
  app.use(require('./controllers/RewardController'));
  app.use(require('./controllers/CategoryController'));
} catch (error) {
  console.error('Error loading controllers:', error);
}

// Simple error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    message: 'Internal server error',
    error: err.message
  });
});

// For Vercel serverless functions
module.exports = app;

// For loca l development
if (require.main === module) {
  const port = process.env.PORT || 3001;

  app.listen(port, () => {
    console.log(` Smart POS Server running on port ${port}`);
  });
}
