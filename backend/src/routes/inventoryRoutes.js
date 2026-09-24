const express = require('express');
const router = express.Router();
const { getInventoryStatus, adjustStock, getTransactions } = require('../controllers/inventoryController');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/role');

router.use(protect);
router.use(restrictTo('admin'));

router.get('/', getInventoryStatus);
router.post('/adjust', adjustStock);
router.get('/transactions', getTransactions);


module.exports = router;
