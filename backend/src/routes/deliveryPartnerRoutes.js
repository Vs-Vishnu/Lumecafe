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
const {
  forgotPassword,
  resetPassword,
  verifyResetToken,
} = require('../controllers/deliveryPartnerAuthController');
const {
  forgotPasswordLimiter,
  resetPasswordLimiter,
} = require('../middleware/rateLimiter');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/role');

// Public Delivery Partner Auth routes (password recovery and reset)
router.post('/auth/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/auth/reset-password', resetPasswordLimiter, resetPassword);
router.get('/auth/verify-token', verifyResetToken);

// All subsequent delivery partner routes are protected and restricted to delivery_partner role
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
