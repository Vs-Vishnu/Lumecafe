const express = require('express');
const router = express.Router();
const {
  assignDeliveryPartner,
  reassignDeliveryPartner,
  getDeliveryAssignments,
} = require('../controllers/deliveryAssignmentController');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/role');

router.use(protect);

// Admin-only assignment operations
router.post('/orders/:id/assign', restrictTo('admin'), assignDeliveryPartner);
router.patch('/orders/:id/reassign', restrictTo('admin'), reassignDeliveryPartner);
router.get('/', restrictTo('admin'), getDeliveryAssignments);

module.exports = router;
