const express = require('express');
const router = express.Router();
const { 
  getAnalyticsOverview, 
  refreshAnalytics, 
  getDiscountRecommendations, 
  createDiscountRecommendation 
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/role');

// All analytics routes require authentication AND Admin authorization
router.use(protect);
router.use(restrictTo('admin'));

router.get('/overview', getAnalyticsOverview);
router.post('/refresh', refreshAnalytics);
router.get('/discount-recommendations', getDiscountRecommendations);
router.post('/create-discount', createDiscountRecommendation);

module.exports = router;
