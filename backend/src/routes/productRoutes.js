const express = require('express');
const router = express.Router();
const { getProducts, getProductById, createProduct, updateProduct, deleteProduct } = require('../controllers/productController');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/role');

router.use(protect);

router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', restrictTo('admin'), createProduct);
router.put('/:id', restrictTo('admin'), updateProduct);
router.delete('/:id', restrictTo('admin'), deleteProduct);

module.exports = router;
