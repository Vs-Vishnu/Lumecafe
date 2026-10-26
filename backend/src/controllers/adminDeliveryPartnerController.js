const crypto = require('crypto');
const DeliveryInvitation = require('../models/DeliveryInvitation');
const DeliveryPartnerProfile = require('../models/DeliveryPartnerProfile');
const DeliveryAssignment = require('../models/DeliveryAssignment');
const User = require('../models/User');
const emailService = require('../services/emailService');

// @desc    Send a delivery partner invitation
// @route   POST /api/admin/delivery-partners/invitations
// @access  Private (Admin only)
exports.sendInvitation = async (req, res, next) => {
  const { email, name, phone } = req.body;

  if (!email || !name) {
    return res.status(400).json({
      success: false,
      message: 'Name and email are required to invite a delivery partner.',
    });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists as an active delivery partner
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser && existingUser.role === 'delivery_partner' && existingUser.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'This user is already an active Delivery Partner.',
      });
    }

    // Check for existing pending invitation
    const pendingInvitation = await DeliveryInvitation.findOne({
      email: normalizedEmail,
      status: 'pending',
      expiresAt: { $gt: Date.now() },
    });

    if (pendingInvitation) {
      return res.status(400).json({
        success: false,
        message: 'A pending invitation already exists for this email. You can resend it instead.',
      });
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const invitation = await DeliveryInvitation.create({
      email: normalizedEmail,
      name: name.trim(),
      phone: phone ? phone.trim() : '',
      tokenHash,
      token,
      invitedBy: req.user._id,
      expiresAt,
      status: 'pending',
    });

    // Send email
    await emailService.sendDeliveryInvitationEmail({
      to: invitation.email,
      name: invitation.name,
      token,
      expiresAt,
    });

    res.status(201).json({
      success: true,
      message: `Invitation successfully sent to ${invitation.email}.`,
      data: {
        _id: invitation._id,
        email: invitation.email,
        name: invitation.name,
        phone: invitation.phone,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all invitations
// @route   GET /api/admin/delivery-partners/invitations
// @access  Private (Admin only)
exports.getInvitations = async (req, res, next) => {
  try {
    const invitations = await DeliveryInvitation.find()
      .populate('invitedBy', 'name email')
      .sort({ createdAt: -1 });

    // Mark expired invitations dynamically
    const now = new Date();
    const processed = invitations.map((inv) => {
      const obj = inv.toObject();
      if (obj.status === 'pending' && now > new Date(obj.expiresAt)) {
        obj.status = 'expired';
      }
      return obj;
    });

    res.json({
      success: true,
      count: processed.length,
      data: processed,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend invitation
// @route   POST /api/admin/delivery-partners/invitations/:id/resend
// @access  Private (Admin only)
exports.resendInvitation = async (req, res, next) => {
  try {
    const invitation = await DeliveryInvitation.findById(req.params.id);

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found.',
      });
    }

    if (invitation.status === 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'This invitation has already been accepted.',
      });
    }

    // Refresh token and expiration
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    invitation.token = token;
    invitation.tokenHash = tokenHash;
    invitation.expiresAt = expiresAt;
    invitation.status = 'pending';
    await invitation.save();

    await emailService.sendDeliveryInvitationEmail({
      to: invitation.email,
      name: invitation.name,
      token,
      expiresAt,
    });

    res.json({
      success: true,
      message: `Invitation resent to ${invitation.email}.`,
      data: invitation,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Revoke invitation
// @route   POST /api/admin/delivery-partners/invitations/:id/revoke
// @access  Private (Admin only)
exports.revokeInvitation = async (req, res, next) => {
  try {
    const invitation = await DeliveryInvitation.findById(req.params.id);

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found.',
      });
    }

    if (invitation.status === 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Cannot revoke an already accepted invitation.',
      });
    }

    invitation.status = 'revoked';
    await invitation.save();

    res.json({
      success: true,
      message: 'Invitation revoked successfully.',
      data: invitation,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all delivery partner accounts
// @route   GET /api/admin/delivery-partners
// @access  Private (Admin only)
exports.getDeliveryPartners = async (req, res, next) => {
  try {
    const partners = await User.find({ role: 'delivery_partner' })
      .select('-password')
      .sort({ createdAt: -1 });

    const partnerIds = partners.map((p) => p._id);
    const profiles = await DeliveryPartnerProfile.find({ user: { $in: partnerIds } });

    const profileMap = new Map();
    profiles.forEach((p) => profileMap.set(p.user.toString(), p));

    const combined = partners.map((partner) => {
      const profile = profileMap.get(partner._id.toString()) || {};
      return {
        _id: partner._id,
        name: partner.name,
        email: partner.email,
        phone: partner.phone || profile.phone || '',
        status: partner.status,
        availability: profile.availability || 'available',
        vehicleType: profile.vehicleType || 'Bike',
        vehicleNumber: profile.vehicleNumber || '',
        activeOrdersCount: profile.activeOrdersCount || 0,
        totalDeliveries: profile.totalDeliveries || 0,
        rating: profile.rating || 5.0,
        createdAt: partner.createdAt,
      };
    });

    res.json({
      success: true,
      count: combined.length,
      data: combined,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get available delivery partners eligible for assignment
// @route   GET /api/admin/delivery-partners/available
// @access  Private (Admin only)
exports.getAvailablePartners = async (req, res, next) => {
  try {
    const activePartners = await User.find({
      role: 'delivery_partner',
      status: 'active',
    }).select('-password');

    const partnerIds = activePartners.map((p) => p._id);

    // Find profiles with availability = 'available'
    const profiles = await DeliveryPartnerProfile.find({
      user: { $in: partnerIds },
      availability: 'available',
    });

    const profileMap = new Map();
    profiles.forEach((p) => profileMap.set(p.user.toString(), p));

    const available = [];
    for (const partner of activePartners) {
      const profile = profileMap.get(partner._id.toString());
      if (profile) {
        available.push({
          _id: partner._id,
          name: partner.name,
          email: partner.email,
          phone: partner.phone || profile.phone || '',
          availability: profile.availability,
          vehicleType: profile.vehicleType,
          vehicleNumber: profile.vehicleNumber,
          activeOrdersCount: profile.activeOrdersCount || 0,
          totalDeliveries: profile.totalDeliveries || 0,
        });
      }
    }

    res.json({
      success: true,
      count: available.length,
      data: available,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get delivery partner by ID with details & delivery history
// @route   GET /api/admin/delivery-partners/:id
// @access  Private (Admin only)
exports.getDeliveryPartnerById = async (req, res, next) => {
  try {
    const partner = await User.findOne({
      _id: req.params.id,
      role: 'delivery_partner',
    }).select('-password');

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Delivery partner not found.',
      });
    }

    const profile = (await DeliveryPartnerProfile.findOne({ user: partner._id })) || {};
    const assignments = await DeliveryAssignment.find({ deliveryPartner: partner._id })
      .populate('order', 'orderNumber grandTotal deliveryAddress date deliveryStatus')
      .sort({ createdAt: -1 })
      .limit(30);

    res.json({
      success: true,
      data: {
        partner,
        profile,
        assignments,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update delivery partner status (Activate / Deactivate)
// @route   PATCH /api/admin/delivery-partners/:id/status
// @access  Private (Admin only)
exports.updatePartnerStatus = async (req, res, next) => {
  const { status } = req.body;

  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Status must be active or inactive.',
    });
  }

  try {
    const partner = await User.findOne({
      _id: req.params.id,
      role: 'delivery_partner',
    });

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Delivery partner not found.',
      });
    }

    partner.status = status;
    await partner.save();

    // If deactivated, set profile availability to offline
    if (status === 'inactive') {
      await DeliveryPartnerProfile.findOneAndUpdate(
        { user: partner._id },
        { availability: 'offline' }
      );
    }

    res.json({
      success: true,
      message: `Delivery partner account marked as ${status}.`,
      data: {
        _id: partner._id,
        name: partner.name,
        email: partner.email,
        status: partner.status,
      },
    });
  } catch (error) {
    next(error);
  }
};
