const mongoose = require('mongoose');

const deliveryEventSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    actorName: {
      type: String,
      default: 'System',
    },
    actorRole: {
      type: String,
      default: 'system',
    },
    eventType: {
      type: String,
      required: true,
      enum: [
        'ORDER_PLACED',
        'ORDER_CONFIRMED',
        'PREPARING',
        'READY_FOR_DISPATCH',
        'ASSIGNED',
        'REASSIGNED',
        'ACCEPTED',
        'REJECTED',
        'PICKED_UP',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'CANCELLED',
        'ISSUE_REPORTED',
      ],
      index: true,
    },
    previousStatus: {
      type: String,
      default: '',
    },
    newStatus: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('DeliveryEvent', deliveryEventSchema);
