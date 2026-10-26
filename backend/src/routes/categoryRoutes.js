const express = require('express');
const router = express.Router();
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/role');

router.get('/', getCategories);

router.use(protect);
router.post('/', restrictTo('admin'), createCategory);
router.put('/:id', restrictTo('admin'), updateCategory);
router.delete('/:id', restrictTo('admin'), deleteCategory);

module.exports = router;
