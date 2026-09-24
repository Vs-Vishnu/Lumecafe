const mongoose = require('mongoose');

const businessSettingsSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      default: 'LumeBills',
    },
    logo: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      default: '123 Main Street, Suite 100',
    },
    phone: {
      type: String,
      default: '+91 98765 43210',
    },
    email: {
      type: String,
      default: 'info@lumebills.com',
    },
    website: {
      type: String,
      default: 'www.lumebills.com',
    },
    gstNumber: {
      type: String,
      default: '',
    },
    currency: {
      type: String,
      default: '₹',
    },
    taxPercentage: {
      type: Number,
      default: 5,
    },
    invoicePrefix: {
      type: String,
      default: 'LB',
    },
    nextInvoiceNumber: {
      type: Number,
      default: 1,
    },
    tagline: {
      type: String,
      default: 'Fast. Simple. Accurate.',
    },
    billingImage: {
      type: String,
      default: '',
    },
    billingGridColumns: {
      type: Number,
      default: 4,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('BusinessSettings', businessSettingsSchema);
