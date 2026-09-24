const Discount = require('../models/Discount');
const Product = require('../models/Product');

// @desc    Get active discounts (Lightweight endpoint for Billing & Cashier)
// @route   GET /api/discounts/active
// @access  Private (Admin & Cashier)
exports.getActiveDiscounts = async (req, res, next) => {
  try {
    const discounts = await Discount.find({ status: 'active' }).populate('product', 'name price status');
    res.json({ success: true, data: discounts });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all discounts for Admin management
// @route   GET /api/discounts
// @access  Private (Admin Only)
exports.getAllDiscounts = async (req, res, next) => {
  try {
    const discounts = await Discount.find().populate('product', 'name price costPrice category').sort({ createdAt: -1 });
    res.json({ success: true, data: discounts });
  } catch (error) {
    next(error);
  }
};

// @desc    Create and activate a new discount rule (Admin Only)
// @route   POST /api/discounts
// @access  Private (Admin Only)
exports.createDiscount = async (req, res, next) => {
  try {
    const { 
      productId, 
      discountType = 'Percentage', 
      discountValue, 
      startDate, 
      endDate, 
      startTime = '00:00', 
      endTime = '23:59', 
      applicableDays,
      status = 'active'
    } = req.body;

    if (!productId || discountValue === undefined || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Please provide all required discount parameters.' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Target product not found.' });
    }

    // Margin Protection check for percentage discounts
    if (product.costPrice > 0) {
      let finalPrice = product.price;
      if (discountType === 'Percentage') {
        finalPrice = product.price * (1 - discountValue / 100);
      } else {
        finalPrice = product.price - discountValue;
      }

      if (finalPrice < product.costPrice) {
        return res.status(400).json({
          success: false,
          message: `Discount price (₹${finalPrice.toFixed(2)}) cannot drop below product cost price (₹${product.costPrice.toFixed(2)}).`,
        });
      }
    }

    const discount = await Discount.create({
      product: productId,
      discountType,
      discountValue: Number(discountValue),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      startTime,
      endTime,
      applicableDays: applicableDays && applicableDays.length > 0 
        ? applicableDays 
        : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      status,
      createdBy: req.user._id,
      createdByName: req.user.name || 'Admin',
    });

    const populated = await discount.populate('product', 'name price');

    res.status(201).json({
      success: true,
      message: `Discount of ${discountType === 'Percentage' ? `${discountValue}%` : `₹${discountValue}`} activated for ${product.name}!`,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update discount rule parameters or status (Admin Only)
// @route   PUT /api/discounts/:id
// @access  Private (Admin Only)
exports.updateDiscount = async (req, res, next) => {
  try {
    const discount = await Discount.findById(req.params.id);
    if (!discount) {
      return res.status(404).json({ success: false, message: 'Discount rule not found.' });
    }

    const { discountType, discountValue, startDate, endDate, startTime, endTime, applicableDays, status } = req.body;

    if (discountType) discount.discountType = discountType;
    if (discountValue !== undefined) discount.discountValue = Number(discountValue);
    if (startDate) discount.startDate = new Date(startDate);
    if (endDate) discount.endDate = new Date(endDate);
    if (startTime) discount.startTime = startTime;
    if (endTime) discount.endTime = endTime;
    if (applicableDays) discount.applicableDays = applicableDays;
    if (status) discount.status = status;

    await discount.save();
    const updated = await discount.populate('product', 'name price');

    res.json({
      success: true,
      message: `Discount for ${updated.product?.name || 'product'} updated successfully.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a discount rule (Admin Only)
// @route   DELETE /api/discounts/:id
// @access  Private (Admin Only)
exports.deleteDiscount = async (req, res, next) => {
  try {
    const discount = await Discount.findById(req.params.id);
    if (!discount) {
      return res.status(404).json({ success: false, message: 'Discount rule not found.' });
    }

    await Discount.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Discount rule deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
