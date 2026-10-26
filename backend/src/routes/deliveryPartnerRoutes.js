const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getMyAssignments,
  getAssignmentById,
  acceptAssignment,
  rejectAssignment,
  pickupOrder,
  startDelivery,
  completeDelivery,
  reportIssue,
  updateAvailability,
  updateLocation,
} = require('../controllers/deliveryPartnerController');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/role');

// All delivery partner routes protected and restricted to delivery_partner role
router.use(protect);
router.use(restrictTo('delivery_partner'));

router.get('/dashboard', getDashboardStats);
router.get('/assignments', getMyAssignments);
router.get('/assignments/:id', getAssignmentById);
router.post('/assignments/:id/accept', acceptAssignment);
router.post('/assignments/:id/reject', rejectAssignment);
router.post('/assignments/:id/pickup', pickupOrder);
router.post('/assignments/:id/start', startDelivery);
router.post('/assignments/:id/complete', completeDelivery);
router.post('/assignments/:id/report-issue', reportIssue);
router.patch('/availability', updateAvailability);
router.post('/location', updateLocation);

module.exports = router;
