const express = require('express');
const router = express.Router();
const {
  getCustomerAddresses,
  createCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
  createCustomerOrder,
  getCustomerOrders,
  getCustomerOrderById,
  cancelCustomerOrder,
} = require('../controllers/customerPortalController');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/role');

// All customer endpoints require authentication and 'customer' (or 'admin') role
router.use(protect);
router.use(restrictTo('customer', 'admin'));

// Address management
router.get('/addresses', getCustomerAddresses);
router.post('/addresses', createCustomerAddress);
router.put('/addresses/:id', updateCustomerAddress);
router.delete('/addresses/:id', deleteCustomerAddress);

// Order management
router.post('/orders', createCustomerOrder);
router.get('/orders', getCustomerOrders);
router.get('/orders/:id', getCustomerOrderById);
router.post('/orders/:id/cancel', cancelCustomerOrder);

module.exports = router;
