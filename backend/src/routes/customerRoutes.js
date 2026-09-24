const express = require('express');
const router = express.Router();
const { getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer } = require('../controllers/customerController');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/role');

router.use(protect);

router.get('/', getCustomers);
router.get('/:id', restrictTo('admin'), getCustomerById);
router.post('/', createCustomer);
router.put('/:id', restrictTo('admin'), updateCustomer);
router.delete('/:id', restrictTo('admin'), deleteCustomer);


module.exports = router;
