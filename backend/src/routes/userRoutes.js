const express = require('express');
const router = express.Router();
const { getUsers, createUser, updateUser, resetPassword, deleteUser } = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/role');

router.use(protect);
router.use(restrictTo('admin'));

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.put('/:id/reset-password', resetPassword);
router.delete('/:id', deleteUser);

module.exports = router;
