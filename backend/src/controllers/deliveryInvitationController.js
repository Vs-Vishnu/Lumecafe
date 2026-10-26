const crypto = require('crypto');
const DeliveryInvitation = require('../models/DeliveryInvitation');
const DeliveryPartnerProfile = require('../models/DeliveryPartnerProfile');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const emailService = require('../services/emailService');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretkey_lumebills_2026', {
    expiresIn: '30d',
  });
};

// @desc    Validate a delivery partner invitation token
// @route   GET /api/delivery-invitations/:token/validate
// @access  Public
exports.validateInvitationToken = async (req, res, next) => {
  const { token } = req.params;

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find invitation by token or tokenHash
    const invitation = await DeliveryInvitation.findOne({
      $or: [{ token }, { tokenHash }],
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found or invalid link.',
      });
    }

    if (invitation.status === 'revoked') {
      return res.status(400).json({
        success: false,
        message: 'This delivery partner invitation has been revoked by the administrator.',
      });
    }

    if (invitation.status === 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'This invitation has already been accepted. Please sign in.',
      });
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      invitation.status = 'expired';
      await invitation.save();
      return res.status(400).json({
        success: false,
        message: 'This invitation has expired. Please contact the administrator to resend an invitation.',
      });
    }

    res.json({
      success: true,
      data: {
        email: invitation.email,
        name: invitation.name,
        phone: invitation.phone,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Accept delivery partner invitation & activate account
// @route   POST /api/delivery-invitations/:token/accept
// @access  Public
exports.acceptInvitation = async (req, res, next) => {
  const { token } = req.params;
  const { password, phone, vehicleType = 'Bike', vehicleNumber = '' } = req.body;

  if (!password || password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'A password of at least 6 characters is required.',
    });
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const invitation = await DeliveryInvitation.findOne({
      $or: [{ token }, { tokenHash }],
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found or invalid token.',
      });
    }

    if (invitation.status !== 'pending' || new Date() > new Date(invitation.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'This invitation is no longer active, expired, or has already been used.',
      });
    }

    // Check if user already exists
    let user = await User.findOne({ email: invitation.email });

    if (user) {
      // Check if already a delivery partner or active
      if (user.role === 'delivery_partner' && user.status === 'active') {
        invitation.status = 'accepted';
        invitation.acceptedAt = new Date();
        await invitation.save();
        return res.status(400).json({
          success: false,
          message: 'An active Delivery Partner account already exists for this email. Please log in.',
        });
      }

      // Upgrade/Activate account with delivery_partner role
      user.role = 'delivery_partner';
      user.password = password; // Pre-save will hash
      user.status = 'active';
      user.isEmailVerified = true;
      if (phone) user.phone = phone.trim();
      await user.save();
    } else {
      // Create new Delivery Partner user
      user = await User.create({
        name: invitation.name,
        email: invitation.email,
        password,
        phone: phone || invitation.phone || '',
        role: 'delivery_partner',
        status: 'active',
        isEmailVerified: true,
      });
    }

    // Upsert DeliveryPartnerProfile
    await DeliveryPartnerProfile.findOneAndUpdate(
      { user: user._id },
      {
        user: user._id,
        availability: 'available',
        vehicleType,
        vehicleNumber,
        phone: user.phone,
      },
      { upsert: true, new: true }
    );

    // Mark invitation as accepted
    invitation.status = 'accepted';
    invitation.acceptedAt = new Date();
    await invitation.save();

    // Send confirmation email
    emailService
      .sendDeliveryInvitationAcceptedEmail({
        to: user.email,
        name: user.name,
      })
      .catch((err) => console.error('[Invitation] Error sending acceptance email:', err.message));

    const authToken = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Delivery partner account activated successfully! Welcome aboard.',
      token: authToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    next(error);
  }
};
