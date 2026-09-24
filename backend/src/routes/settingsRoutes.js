const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/role');

router.use(protect);

router.get('/', getSettings);
router.put('/', restrictTo('admin'), updateSettings);

module.exports = router;
