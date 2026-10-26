const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  originalPrice: {
    type: Number,
    default: function() { return this.price; },
    min: 0,
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  costPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  taxPercentage: {
    type: Number,
    default: 0,
    min: 0,
  },
  total: {
    type: Number,
    required: true,
    min: 0,
  },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null, // Null indicates Walk-in Customer
    },
    customerDetails: {
      name: { type: String, default: 'Walk-in Customer' },
      phone: { type: String, default: '' },
    },
    items: [orderItemSchema],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'UPI', 'Card'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'Pending', 'Failed'],
      default: 'Paid',
    },
    cashier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
    },
    cashierName: {
      type: String,
      default: 'Admin',
    },
    status: {
      type: String,
      enum: ['Completed', 'Cancelled', 'Refunded', 'In Progress', 'Pending'],
      default: 'Completed',
    },
    orderType: {
      type: String,
      enum: ['dine_in', 'takeaway', 'delivery'],
      default: 'dine_in',
      index: true,
    },
    deliveryStatus: {
      type: String,
      enum: [
        'order_placed',
        'confirmed',
        'preparing',
        'ready_for_dispatch',
        'assigned',
        'picked_up',
        'out_for_delivery',
        'delivered',
        'cancelled',
      ],
      default: null,
      index: true,
    },
    customerUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    deliveryAddress: {
      fullName: { type: String, default: '' },
      phone: { type: String, default: '' },
      houseNumber: { type: String, default: '' },
      streetName: { type: String, default: '' },
      area: { type: String, default: '' },
      city: { type: String, default: '' },
      district: { type: String, default: '' },
      state: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      landmark: { type: String, default: '' },
      deliveryInstructions: { type: String, default: '' },
      coordinates: {
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null },
      },
    },
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    deliveryAssignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryAssignment',
      default: null,
    },
    deliveryConfirmationCode: {
      type: String,
      default: null,
    },
    estimatedDeliveryMinutes: {
      type: Number,
      default: 30,
    },
    pickedUpAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      enum: ['billing', 'excel_import', 'customer_portal'],
      default: 'billing',
    },
    importBatch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ImportHistory',
      default: null,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexing for faster reporting
orderSchema.index({ date: -1 });

module.exports = mongoose.model('Order', orderSchema);

