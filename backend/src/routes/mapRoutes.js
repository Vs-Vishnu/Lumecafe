const express = require('express');
const router = express.Router();
const { geocode, getRoute } = require('../controllers/mapController');
const { protect } = require('../middleware/auth');

// Map endpoints require valid authentication
router.use(protect);

router.post('/geocode', geocode);
router.post('/route', getRoute);

module.exports = router;
