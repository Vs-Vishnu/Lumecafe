const Order = require('../models/Order');
const DeliveryAssignment = require('../models/DeliveryAssignment');
const DeliveryPartnerProfile = require('../models/DeliveryPartnerProfile');
const DeliveryEvent = require('../models/DeliveryEvent');
const User = require('../models/User');
const emailService = require('../services/emailService');

// @desc    Assign eligible order to delivery partner
// @route   POST /api/admin/orders/:id/assign-delivery-partner
// @access  Private (Admin only)
exports.assignDeliveryPartner = async (req, res, next) => {
  const { deliveryPartnerId, notes } = req.body;
  const orderId = req.params.id;

  if (!deliveryPartnerId) {
    return res.status(400).json({
      success: false,
      message: 'Please select a delivery partner to assign.',
    });
  }

  try {
    const order = await Order.findById(orderId).populate('customerUser', 'name email phone');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Verify delivery partner exists and is active
    const partner = await User.findOne({
      _id: deliveryPartnerId,
      role: 'delivery_partner',
      status: 'active',
    });

    if (!partner) {
      return res.status(400).json({
        success: false,
        message: 'Selected delivery partner is invalid or inactive.',
      });
    }

    // Check partner profile & availability
    const profile = await DeliveryPartnerProfile.findOne({ user: partner._id });
    if (profile && profile.availability === 'offline') {
      return res.status(400).json({
        success: false,
        message: 'Selected partner is currently offline and cannot receive new deliveries.',
      });
    }

    // Check if order already has an active assignment
    let assignment = await DeliveryAssignment.findOne({ order: order._id });

    if (assignment && ['picked_up', 'out_for_delivery', 'delivered'].includes(assignment.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot assign order: it is already in '${assignment.status}' state. Use reassignment if necessary.`,
      });
    }

    const previousPartnerId = assignment ? assignment.deliveryPartner : null;

    if (assignment) {
      // Reassigning existing assignment
      assignment.reassignmentHistory.push({
        previousPartner: previousPartnerId,
        newPartner: partner._id,
        reassignedBy: req.user._id,
        reason: notes || 'Admin order assignment update',
        timestamp: new Date(),
      });
      assignment.deliveryPartner = partner._id;
      assignment.assignedBy = req.user._id;
      assignment.status = 'assigned';
      assignment.assignedAt = new Date();
      if (notes) assignment.notes = notes;
      await assignment.save();
    } else {
      // Create fresh assignment
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      assignment = await DeliveryAssignment.create({
        order: order._id,
        deliveryPartner: partner._id,
        assignedBy: req.user._id,
        status: 'assigned',
        deliveryConfirmationCode: code,
        notes: notes || '',
      });
    }

    // Update Order model
    order.deliveryPartner = partner._id;
    order.deliveryAssignment = assignment._id;
    order.deliveryStatus = 'assigned';
    if (!order.deliveryConfirmationCode) {
      order.deliveryConfirmationCode = assignment.deliveryConfirmationCode;
    }
    await order.save();

    // Update partner workloads
    if (previousPartnerId && previousPartnerId.toString() !== partner._id.toString()) {
      await DeliveryPartnerProfile.findOneAndUpdate(
        { user: previousPartnerId },
        { $inc: { activeOrdersCount: -1 } }
      );
    }
    await DeliveryPartnerProfile.findOneAndUpdate(
      { user: partner._id },
      { $inc: { activeOrdersCount: 1 } }
    );

    // Create DeliveryEvent audit record
    await DeliveryEvent.create({
      order: order._id,
      actor: req.user._id,
      actorName: req.user.name,
      actorRole: 'admin',
      eventType: previousPartnerId ? 'REASSIGNED' : 'ASSIGNED',
      previousStatus: previousPartnerId ? 'assigned' : (order.deliveryStatus || 'confirmed'),
      newStatus: 'assigned',
      notes: `Order assigned to ${partner.name}. ${notes ? `Note: ${notes}` : ''}`,
    });

    // Notify Delivery Partner via email
    emailService
      .sendAssignmentNotificationEmail({
        to: partner.email,
        partnerName: partner.name,
        order,
      })
      .catch((err) => console.error('[Assignment] Partner notify error:', err.message));

    // Notify Customer if online order with customer user or customer phone
    const customerEmail = order.customerUser?.email || order.deliveryAddress?.phone;
    if (order.customerUser?.email) {
      emailService
        .sendOrderStatusNotificationEmail({
          to: order.customerUser.email,
          order,
          status: 'assigned',
          partnerName: partner.name,
          partnerPhone: partner.phone,
        })
        .catch((err) => console.error('[Assignment] Customer notify error:', err.message));
    }

    res.json({
      success: true,
      message: `Order #${order.orderNumber} successfully assigned to ${partner.name}.`,
      data: {
        order,
        assignment,
        partner: {
          _id: partner._id,
          name: partner.name,
          phone: partner.phone,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reassign order to a new delivery partner
// @route   PATCH /api/admin/orders/:id/reassign-delivery-partner
// @access  Private (Admin only)
exports.reassignDeliveryPartner = async (req, res, next) => {
  const { newDeliveryPartnerId, reason } = req.body;
  const orderId = req.params.id;

  if (!newDeliveryPartnerId) {
    return res.status(400).json({ success: false, message: 'New delivery partner ID is required.' });
  }

  if (!reason) {
    return res.status(400).json({ success: false, message: 'Please provide a reason for reassignment.' });
  }

  try {
    const order = await Order.findById(orderId).populate('customerUser', 'name email phone');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const newPartner = await User.findOne({
      _id: newDeliveryPartnerId,
      role: 'delivery_partner',
      status: 'active',
    });

    if (!newPartner) {
      return res.status(400).json({ success: false, message: 'Selected new delivery partner is not active.' });
    }

    const assignment = await DeliveryAssignment.findOne({ order: order._id });
    if (!assignment) {
      return res.status(400).json({ success: false, message: 'No active delivery assignment exists to reassign.' });
    }

    const previousPartnerId = assignment.deliveryPartner;

    // Record reassignment audit
    assignment.reassignmentHistory.push({
      previousPartner: previousPartnerId,
      newPartner: newPartner._id,
      reassignedBy: req.user._id,
      reason,
      timestamp: new Date(),
    });

    assignment.deliveryPartner = newPartner._id;
    assignment.assignedBy = req.user._id;
    assignment.status = 'assigned';
    assignment.assignedAt = new Date();
    await assignment.save();

    order.deliveryPartner = newPartner._id;
    order.deliveryStatus = 'assigned';
    await order.save();

    // Update workload
    if (previousPartnerId) {
      await DeliveryPartnerProfile.findOneAndUpdate(
        { user: previousPartnerId },
        { $inc: { activeOrdersCount: -1 } }
      );
    }
    await DeliveryPartnerProfile.findOneAndUpdate(
      { user: newPartner._id },
      { $inc: { activeOrdersCount: 1 } }
    );

    // Record audit event
    await DeliveryEvent.create({
      order: order._id,
      actor: req.user._id,
      actorName: req.user.name,
      actorRole: 'admin',
      eventType: 'REASSIGNED',
      previousStatus: 'assigned',
      newStatus: 'assigned',
      notes: `Reassigned to ${newPartner.name}. Reason: ${reason}`,
    });

    // Notify new partner
    emailService
      .sendAssignmentNotificationEmail({
        to: newPartner.email,
        partnerName: newPartner.name,
        order,
      })
      .catch((err) => console.error('[Reassignment] Email error:', err.message));

    res.json({
      success: true,
      message: `Order successfully reassigned to ${newPartner.name}.`,
      data: {
        order,
        assignment,
        newPartner: {
          _id: newPartner._id,
          name: newPartner.name,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all delivery assignments with audit trails
// @route   GET /api/admin/delivery-assignments
// @access  Private (Admin only)
exports.getDeliveryAssignments = async (req, res, next) => {
  try {
    const { status, partnerId, page = 1, limit = 25 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (partnerId) filter.deliveryPartner = partnerId;

    const skip = (page - 1) * limit;
    const total = await DeliveryAssignment.countDocuments(filter);

    const assignments = await DeliveryAssignment.find(filter)
      .populate('order', 'orderNumber grandTotal deliveryAddress deliveryStatus date items paymentMethod customerDetails')
      .populate('deliveryPartner', 'name email phone')
      .populate('assignedBy', 'name')
      .populate('reassignmentHistory.previousPartner', 'name')
      .populate('reassignmentHistory.newPartner', 'name')
      .populate('reassignmentHistory.reassignedBy', 'name')
      .sort({ assignedAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      count: assignments.length,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
      data: assignments,
    });
  } catch (error) {
    next(error);
  }
};
