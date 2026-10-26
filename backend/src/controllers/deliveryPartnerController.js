const DeliveryAssignment = require('../models/DeliveryAssignment');
const DeliveryPartnerProfile = require('../models/DeliveryPartnerProfile');
const DeliveryEvent = require('../models/DeliveryEvent');
const Order = require('../models/Order');
const emailService = require('../services/emailService');

// @desc    Get delivery partner dashboard statistics
// @route   GET /api/delivery-partner/dashboard
// @access  Private (Delivery Partner only)
exports.getDashboardStats = async (req, res, next) => {
  try {
    const partnerId = req.user._id;

    // Get partner profile
    let profile = await DeliveryPartnerProfile.findOne({ user: partnerId });
    if (!profile) {
      profile = await DeliveryPartnerProfile.create({ user: partnerId });
    }

    // Counts for this partner
    const assignedCount = await DeliveryAssignment.countDocuments({
      deliveryPartner: partnerId,
      status: 'assigned',
    });

    const activeCount = await DeliveryAssignment.countDocuments({
      deliveryPartner: partnerId,
      status: { $in: ['accepted', 'picked_up', 'out_for_delivery'] },
    });

    const completedCount = await DeliveryAssignment.countDocuments({
      deliveryPartner: partnerId,
      status: 'delivered',
    });

    // Today's completed
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayCompletedCount = await DeliveryAssignment.countDocuments({
      deliveryPartner: partnerId,
      status: 'delivered',
      deliveredAt: { $gte: startOfToday },
    });

    // Find current active assignment if any
    const activeAssignment = await DeliveryAssignment.findOne({
      deliveryPartner: partnerId,
      status: { $in: ['assigned', 'accepted', 'picked_up', 'out_for_delivery'] },
    })
      .populate('order')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      data: {
        profile: {
          availability: profile.availability,
          vehicleType: profile.vehicleType,
          vehicleNumber: profile.vehicleNumber,
          totalDeliveries: profile.totalDeliveries,
          rating: profile.rating,
        },
        stats: {
          assignedOrders: assignedCount,
          activeDeliveries: activeCount,
          completedDeliveries: completedCount,
          todayCompletedDeliveries: todayCompletedCount,
        },
        activeAssignment,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get assigned orders for the authenticated delivery partner
// @route   GET /api/delivery-partner/assignments
// @access  Private (Delivery Partner only)
exports.getMyAssignments = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = { deliveryPartner: req.user._id };

    if (status) {
      filter.status = status;
    }

    const assignments = await DeliveryAssignment.find(filter)
      .populate({
        path: 'order',
        select:
          'orderNumber grandTotal paymentMethod paymentStatus deliveryStatus deliveryAddress items date notes deliveryConfirmationCode customerDetails',
      })
      .sort({ assignedAt: -1 });

    res.json({
      success: true,
      count: assignments.length,
      data: assignments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get details for an assigned delivery
// @route   GET /api/delivery-partner/assignments/:id
// @access  Private (Delivery Partner only)
exports.getAssignmentById = async (req, res, next) => {
  try {
    const assignment = await DeliveryAssignment.findOne({
      _id: req.params.id,
      deliveryPartner: req.user._id,
    }).populate('order');

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Delivery assignment not found or access unauthorized.',
      });
    }

    res.json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Accept delivery assignment
// @route   POST /api/delivery-partner/assignments/:id/accept
// @access  Private (Delivery Partner only)
exports.acceptAssignment = async (req, res, next) => {
  try {
    const assignment = await DeliveryAssignment.findOne({
      _id: req.params.id,
      deliveryPartner: req.user._id,
    });

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    if (assignment.status !== 'assigned') {
      return res.status(400).json({
        success: false,
        message: `Cannot accept assignment in '${assignment.status}' state.`,
      });
    }

    assignment.status = 'accepted';
    assignment.acceptedAt = new Date();
    await assignment.save();

    await DeliveryEvent.create({
      order: assignment.order,
      actor: req.user._id,
      actorName: req.user.name,
      actorRole: 'delivery_partner',
      eventType: 'ACCEPTED',
      previousStatus: 'assigned',
      newStatus: 'accepted',
      notes: `${req.user.name} accepted the delivery assignment.`,
    });

    res.json({
      success: true,
      message: 'Delivery assignment accepted.',
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject delivery assignment
// @route   POST /api/delivery-partner/assignments/:id/reject
// @access  Private (Delivery Partner only)
exports.rejectAssignment = async (req, res, next) => {
  const { reason = 'Unable to deliver' } = req.body;

  try {
    const assignment = await DeliveryAssignment.findOne({
      _id: req.params.id,
      deliveryPartner: req.user._id,
    });

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    if (assignment.status !== 'assigned') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject order after it has been ${assignment.status}.`,
      });
    }

    assignment.status = 'rejected';
    assignment.notes = `Rejected by partner: ${reason}`;
    await assignment.save();

    // Decrement active orders count
    await DeliveryPartnerProfile.findOneAndUpdate(
      { user: req.user._id },
      { $inc: { activeOrdersCount: -1 } }
    );

    // Reset order assignment status so Admin can reassign
    await Order.findByIdAndUpdate(assignment.order, {
      deliveryPartner: null,
      deliveryStatus: 'ready_for_dispatch',
    });

    await DeliveryEvent.create({
      order: assignment.order,
      actor: req.user._id,
      actorName: req.user.name,
      actorRole: 'delivery_partner',
      eventType: 'REJECTED',
      previousStatus: 'assigned',
      newStatus: 'rejected',
      notes: `Assignment rejected by ${req.user.name}. Reason: ${reason}`,
    });

    res.json({
      success: true,
      message: 'Delivery assignment rejected. Admin will be notified to reassign.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark order as Picked Up from restaurant/cafe
// @route   POST /api/delivery-partner/assignments/:id/pickup
// @access  Private (Delivery Partner only)
exports.pickupOrder = async (req, res, next) => {
  try {
    const assignment = await DeliveryAssignment.findOne({
      _id: req.params.id,
      deliveryPartner: req.user._id,
    });

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    if (!['assigned', 'accepted'].includes(assignment.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot mark picked up from '${assignment.status}' state.`,
      });
    }

    const now = new Date();
    assignment.status = 'picked_up';
    assignment.pickedUpAt = now;
    await assignment.save();

    const order = await Order.findById(assignment.order).populate('customerUser');
    if (order) {
      order.deliveryStatus = 'picked_up';
      order.pickedUpAt = now;
      await order.save();

      // Notify customer
      if (order.customerUser?.email) {
        emailService
          .sendOrderStatusNotificationEmail({
            to: order.customerUser.email,
            order,
            status: 'picked_up',
            partnerName: req.user.name,
            partnerPhone: req.user.phone,
          })
          .catch((err) => console.error('[Pickup] Email notification error:', err.message));
      }
    }

    await DeliveryEvent.create({
      order: assignment.order,
      actor: req.user._id,
      actorName: req.user.name,
      actorRole: 'delivery_partner',
      eventType: 'PICKED_UP',
      previousStatus: assignment.status,
      newStatus: 'picked_up',
      notes: `Order picked up from kitchen by ${req.user.name}.`,
    });

    res.json({
      success: true,
      message: 'Order marked as Picked Up. Ready to start navigation!',
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Start Delivery (Out for Delivery)
// @route   POST /api/delivery-partner/assignments/:id/start
// @access  Private (Delivery Partner only)
exports.startDelivery = async (req, res, next) => {
  try {
    const assignment = await DeliveryAssignment.findOne({
      _id: req.params.id,
      deliveryPartner: req.user._id,
    });

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    if (!['accepted', 'picked_up'].includes(assignment.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot start delivery from '${assignment.status}' state.`,
      });
    }

    const now = new Date();
    assignment.status = 'out_for_delivery';
    assignment.outForDeliveryAt = now;
    await assignment.save();

    const order = await Order.findById(assignment.order).populate('customerUser');
    if (order) {
      order.deliveryStatus = 'out_for_delivery';
      await order.save();

      if (order.customerUser?.email) {
        emailService
          .sendOrderStatusNotificationEmail({
            to: order.customerUser.email,
            order,
            status: 'out_for_delivery',
            partnerName: req.user.name,
            partnerPhone: req.user.phone,
          })
          .catch((err) => console.error('[StartDelivery] Email error:', err.message));
      }
    }

    await DeliveryEvent.create({
      order: assignment.order,
      actor: req.user._id,
      actorName: req.user.name,
      actorRole: 'delivery_partner',
      eventType: 'OUT_FOR_DELIVERY',
      previousStatus: 'picked_up',
      newStatus: 'out_for_delivery',
      notes: `${req.user.name} is on the way to the customer delivery address.`,
    });

    res.json({
      success: true,
      message: 'Delivery in progress. Safe travels!',
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark delivery as completed
// @route   POST /api/delivery-partner/assignments/:id/complete
// @access  Private (Delivery Partner only)
exports.completeDelivery = async (req, res, next) => {
  const { confirmationCode, notes } = req.body;

  try {
    const assignment = await DeliveryAssignment.findOne({
      _id: req.params.id,
      deliveryPartner: req.user._id,
    });

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    if (assignment.status === 'delivered') {
      return res.status(400).json({ success: false, message: 'Order is already marked delivered.' });
    }

    // Optional confirmation code check if requested
    if (assignment.deliveryConfirmationCode && confirmationCode) {
      if (assignment.deliveryConfirmationCode !== confirmationCode.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid delivery confirmation code. Please verify code with the customer.',
        });
      }
    }

    const now = new Date();
    assignment.status = 'delivered';
    assignment.deliveredAt = now;
    if (notes) assignment.notes = notes;
    await assignment.save();

    // Update order
    const order = await Order.findById(assignment.order).populate('customerUser');
    if (order) {
      order.deliveryStatus = 'delivered';
      order.deliveredAt = now;
      order.status = 'Completed';
      order.paymentStatus = 'Paid';
      await order.save();

      if (order.customerUser?.email) {
        emailService
          .sendOrderStatusNotificationEmail({
            to: order.customerUser.email,
            order,
            status: 'delivered',
            partnerName: req.user.name,
          })
          .catch((err) => console.error('[DeliveryComplete] Email error:', err.message));
      }
    }

    // Update partner workload & statistics
    await DeliveryPartnerProfile.findOneAndUpdate(
      { user: req.user._id },
      {
        $inc: { activeOrdersCount: -1, totalDeliveries: 1 },
      }
    );

    // Record DeliveryEvent
    await DeliveryEvent.create({
      order: assignment.order,
      actor: req.user._id,
      actorName: req.user.name,
      actorRole: 'delivery_partner',
      eventType: 'DELIVERED',
      previousStatus: assignment.status,
      newStatus: 'delivered',
      notes: `Order safely delivered to customer by ${req.user.name}. ${notes || ''}`,
    });

    res.json({
      success: true,
      message: 'Order successfully delivered! Great job.',
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Report a delivery issue
// @route   POST /api/delivery-partner/assignments/:id/report-issue
// @access  Private (Delivery Partner only)
exports.reportIssue = async (req, res, next) => {
  const { reason, details } = req.body;

  if (!reason) {
    return res.status(400).json({ success: false, message: 'Issue reason is required.' });
  }

  try {
    const assignment = await DeliveryAssignment.findOne({
      _id: req.params.id,
      deliveryPartner: req.user._id,
    });

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    assignment.issueReport = {
      reason,
      details: details || '',
      reportedAt: new Date(),
      resolved: false,
    };
    await assignment.save();

    await DeliveryEvent.create({
      order: assignment.order,
      actor: req.user._id,
      actorName: req.user.name,
      actorRole: 'delivery_partner',
      eventType: 'ISSUE_REPORTED',
      previousStatus: assignment.status,
      newStatus: assignment.status,
      notes: `Issue reported: ${reason}. Details: ${details || 'None'}`,
    });

    res.json({
      success: true,
      message: 'Delivery issue recorded. The support team and admin have been alerted.',
      data: assignment.issueReport,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update partner availability (available / busy / offline)
// @route   PATCH /api/delivery-partner/availability
// @access  Private (Delivery Partner only)
exports.updateAvailability = async (req, res, next) => {
  const { availability } = req.body;

  if (!['available', 'busy', 'offline'].includes(availability)) {
    return res.status(400).json({
      success: false,
      message: 'Availability must be available, busy, or offline.',
    });
  }

  try {
    const profile = await DeliveryPartnerProfile.findOneAndUpdate(
      { user: req.user._id },
      { availability },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: `Your status is now ${availability}.`,
      data: { availability: profile.availability },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update delivery partner location during active delivery (with consent)
// @route   POST /api/delivery-partner/location
// @access  Private (Delivery Partner only)
exports.updateLocation = async (req, res, next) => {
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ success: false, message: 'Latitude and longitude are required.' });
  }

  try {
    // Only update if partner has active delivery
    const activeAssignment = await DeliveryAssignment.findOne({
      deliveryPartner: req.user._id,
      status: { $in: ['picked_up', 'out_for_delivery'] },
    });

    if (!activeAssignment) {
      return res.status(400).json({
        success: false,
        message: 'Location updates are only permitted during active deliveries to respect privacy.',
      });
    }

    await DeliveryPartnerProfile.findOneAndUpdate(
      { user: req.user._id },
      {
        currentLocation: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          updatedAt: new Date(),
        },
      }
    );

    res.json({ success: true, message: 'Location updated.' });
  } catch (error) {
    next(error);
  }
};
