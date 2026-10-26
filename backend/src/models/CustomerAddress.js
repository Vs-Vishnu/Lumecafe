const mongoose = require('mongoose');

const customerAddressSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    houseNumber: {
      type: String,
      required: [true, 'House/Flat/Building number is required'],
      trim: true,
    },
    streetName: {
      type: String,
      required: [true, 'Street or road name is required'],
      trim: true,
    },
    area: {
      type: String,
      required: [true, 'Area or locality is required'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    district: {
      type: String,
      trim: true,
      default: '',
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
    },
    postalCode: {
      type: String,
      required: [true, 'Postal / PIN code is required'],
      trim: true,
    },
    landmark: {
      type: String,
      trim: true,
      default: '',
    },
    deliveryInstructions: {
      type: String,
      trim: true,
      default: '',
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    coordinates: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },
  },
  {
    timestamps: true,
  }
);

// Method to format full single-line address
customerAddressSchema.methods.toFormattedAddress = function () {
  const parts = [
    this.houseNumber,
    this.streetName,
    this.area,
    this.city,
    this.district,
    this.state,
    this.postalCode,
  ].filter(Boolean);
  return parts.join(', ');
};

module.exports = mongoose.model('CustomerAddress', customerAddressSchema);
