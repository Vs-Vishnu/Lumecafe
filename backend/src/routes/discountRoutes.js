const express = require('express');
const router = express.Router();
const { 
  getActiveDiscounts, 
  getAllDiscounts, 
  createDiscount, 
  updateDiscount, 
  deleteDiscount 
} = require('../controllers/discountController');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/role');

router.use(protect);

// Lightweight active discounts endpoint (Available to both Admin and Cashier for Billing)
router.get('/active', getActiveDiscounts);

// Admin-Only Management Endpoints
router.get('/', restrictTo('admin'), getAllDiscounts);
router.post('/', restrictTo('admin'), createDiscount);
router.put('/:id', restrictTo('admin'), updateDiscount);
router.delete('/:id', restrictTo('admin'), deleteDiscount);

module.exports = router;
