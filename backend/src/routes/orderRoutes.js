const express = require('express');
const router = express.Router();
const { createOrder, getOrders, getOrderById, updateOrderStatus } = require('../controllers/orderController');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/role');

router.use(protect);

router.post('/', createOrder);
router.get('/', restrictTo('admin'), getOrders);
router.get('/:id', restrictTo('admin'), getOrderById);
router.put('/:id/status', restrictTo('admin'), updateOrderStatus);


module.exports = router;
