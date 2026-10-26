const express = require('express');
const router = express.Router();
const {
  validateInvitationToken,
  acceptInvitation,
} = require('../controllers/deliveryInvitationController');

router.get('/:token/validate', validateInvitationToken);
router.post('/:token/accept', acceptInvitation);

module.exports = router;
