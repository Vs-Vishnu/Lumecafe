const mongoose = require('mongoose');

const reassignmentLogSchema = new mongoose.Schema({
  previousPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  newPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  reassignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  reason: {
    type: String,
    required: true,
    trim: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const deliveryAssignmentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true,
      index: true,
    },
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['assigned', 'accepted', 'rejected', 'picked_up', 'out_for_delivery', 'delivered', 'failed'],
      default: 'assigned',
      index: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    pickedUpAt: {
      type: Date,
      default: null,
    },
    outForDeliveryAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    deliveryConfirmationCode: {
      type: String,
      default: () => Math.floor(1000 + Math.random() * 9000).toString(), // 4 digit secure OTP
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    issueReport: {
      reason: { type: String, default: '' },
      details: { type: String, default: '' },
      reportedAt: { type: Date, default: null },
      resolved: { type: Boolean, default: false },
    },
    reassignmentHistory: [reassignmentLogSchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('DeliveryAssignment', deliveryAssignmentSchema);
