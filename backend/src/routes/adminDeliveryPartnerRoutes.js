const express = require('express');
const router = express.Router();
const {
  sendInvitation,
  getInvitations,
  resendInvitation,
  revokeInvitation,
  getDeliveryPartners,
  getAvailablePartners,
  getDeliveryPartnerById,
  updatePartnerStatus,
} = require('../controllers/adminDeliveryPartnerController');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/role');

// All endpoints in this router are Admin only
router.use(protect);
router.use(restrictTo('admin'));

router.post('/invitations', sendInvitation);
router.get('/invitations', getInvitations);
router.post('/invitations/:id/resend', resendInvitation);
router.post('/invitations/:id/revoke', revokeInvitation);

router.get('/available', getAvailablePartners);
router.get('/', getDeliveryPartners);
router.get('/:id', getDeliveryPartnerById);
router.patch('/:id/status', updatePartnerStatus);

module.exports = router;
