const express = require('express');
const router = express.Router();
const { 
  getDashboardStats, 
  getSalesReport, 
  getProductPerformanceReport, 
  getPaymentMethodReport,
  exportSalesReportExcel,
  deleteReportOrder,
  importSalesReportExcel,
  deleteImportedData,
  getImportHistory
} = require('../controllers/reportController');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/role');

router.use(protect);

router.get('/dashboard', getDashboardStats);
router.get('/sales', getSalesReport);
router.get('/products', getProductPerformanceReport);
router.get('/payments', getPaymentMethodReport);

// Admin-Only Endpoints for Excel Export, Import, Data Cleaning & Record Deletion
router.get('/export/excel', restrictTo('admin'), exportSalesReportExcel);
router.post('/import', restrictTo('admin'), importSalesReportExcel);
router.delete('/imported-data', restrictTo('admin'), deleteImportedData);
router.get('/import/history', restrictTo('admin'), getImportHistory);
router.delete('/orders/:id', restrictTo('admin'), deleteReportOrder);

module.exports = router;
