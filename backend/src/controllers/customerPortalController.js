const CustomerAddress = require('../models/CustomerAddress');
const Order = require('../models/Order');
const Product = require('../models/Product');
const BusinessSettings = require('../models/BusinessSettings');
const DeliveryEvent = require('../models/DeliveryEvent');
const emailService = require('../services/emailService');
const mapService = require('../services/mapService');

// Helper to generate order number
const generateOrderNumber = async () => {
  let settings = await BusinessSettings.findOne();
  if (!settings) {
    settings = await BusinessSettings.create({});
  }

  const prefix = settings.invoicePrefix || 'LB';
  const number = settings.nextInvoiceNumber || 10001;
  const formattedNumber = String(number).padStart(6, '0');

  settings.nextInvoiceNumber = number + 1;
  await settings.save();

  return `${prefix}-${formattedNumber}`;
};

// ==================== CUSTOMER ADDRESS MANAGEMENT ====================

// @desc    Get all saved delivery addresses for current customer
// @route   GET /api/customer/addresses
// @access  Private (Customer only)
exports.getCustomerAddresses = async (req, res, next) => {
  try {
    const addresses = await CustomerAddress.find({ customer: req.user._id }).sort({
      isDefault: -1,
      createdAt: -1,
    });

    res.json({
      success: true,
      count: addresses.length,
      data: addresses,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new manual delivery address
// @route   POST /api/customer/addresses
// @access  Private (Customer only)
exports.createCustomerAddress = async (req, res, next) => {
  const {
    fullName,
    phone,
    houseNumber,
    streetName,
    area,
    city,
    district,
    state,
    postalCode,
    landmark,
    deliveryInstructions,
    isDefault = false,
  } = req.body;

  // Validate required manual fields
  if (!fullName || !phone || !houseNumber || !streetName || !area || !city || !state || !postalCode) {
    return res.status(400).json({
      success: false,
      message: 'Please fill in all required address fields (Name, Phone, House/Flat No, Street, Area, City, State, and Postal Code).',
    });
  }

  // Validate postal code format (e.g. 6-digit numeric for India or standard 5-6 digit)
  const cleanedPostal = postalCode.toString().trim();
  if (!/^\d{5,6}$/.test(cleanedPostal)) {
    return res.status(400).json({
      success: false,
      message: 'Please enter a valid 5 or 6 digit postal / PIN code.',
    });
  }

  try {
    // If setting as default, unset other defaults
    if (isDefault) {
      await CustomerAddress.updateMany({ customer: req.user._id }, { isDefault: false });
    } else {
      // If this is the customer's first address, make it default automatically
      const existingCount = await CustomerAddress.countDocuments({ customer: req.user._id });
      if (existingCount === 0) {
        req.body.isDefault = true;
      }
    }

    // Optional geocoding on backend for navigation convenience
    let coordinates = { latitude: null, longitude: null };
    try {
      const geoResult = await mapService.geocodeAddress({
        houseNumber,
        streetName,
        area,
        city,
        state,
        postalCode: cleanedPostal,
      });
      if (geoResult?.latitude && geoResult?.longitude) {
        coordinates = {
          latitude: geoResult.latitude,
          longitude: geoResult.longitude,
        };
      }
    } catch (geoErr) {
      console.warn('[Address] Geocoding fallback notice:', geoErr.message);
    }

    const address = await CustomerAddress.create({
      customer: req.user._id,
      fullName: fullName.trim(),
      phone: phone.trim(),
      houseNumber: houseNumber.trim(),
      streetName: streetName.trim(),
      area: area.trim(),
      city: city.trim(),
      district: district ? district.trim() : '',
      state: state.trim(),
      postalCode: cleanedPostal,
      landmark: landmark ? landmark.trim() : '',
      deliveryInstructions: deliveryInstructions ? deliveryInstructions.trim() : '',
      isDefault: Boolean(req.body.isDefault || isDefault),
      coordinates,
    });

    res.status(201).json({
      success: true,
      message: 'Delivery address saved successfully.',
      data: address,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a saved delivery address
// @route   PUT /api/customer/addresses/:id
// @access  Private (Customer only)
exports.updateCustomerAddress = async (req, res, next) => {
  try {
    const address = await CustomerAddress.findOne({
      _id: req.params.id,
      customer: req.user._id,
    });

    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found or unauthorized.' });
    }

    const {
      fullName,
      phone,
      houseNumber,
      streetName,
      area,
      city,
      district,
      state,
      postalCode,
      landmark,
      deliveryInstructions,
      isDefault,
    } = req.body;

    if (postalCode) {
      const cleanedPostal = postalCode.toString().trim();
      if (!/^\d{5,6}$/.test(cleanedPostal)) {
        return res.status(400).json({ success: false, message: 'Invalid postal code format.' });
      }
      address.postalCode = cleanedPostal;
    }

    if (isDefault) {
      await CustomerAddress.updateMany({ customer: req.user._id }, { isDefault: false });
      address.isDefault = true;
    }

    if (fullName) address.fullName = fullName.trim();
    if (phone) address.phone = phone.trim();
    if (houseNumber) address.houseNumber = houseNumber.trim();
    if (streetName) address.streetName = streetName.trim();
    if (area) address.area = area.trim();
    if (city) address.city = city.trim();
    if (district !== undefined) address.district = district.trim();
    if (state) address.state = state.trim();
    if (landmark !== undefined) address.landmark = landmark.trim();
    if (deliveryInstructions !== undefined) address.deliveryInstructions = deliveryInstructions.trim();

    const updated = await address.save();

    res.json({
      success: true,
      message: 'Address updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a saved delivery address
// @route   DELETE /api/customer/addresses/:id
// @access  Private (Customer only)
exports.deleteCustomerAddress = async (req, res, next) => {
  try {
    const address = await CustomerAddress.findOne({
      _id: req.params.id,
      customer: req.user._id,
    });

    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found or unauthorized.' });
    }

    await address.deleteOne();

    res.json({
      success: true,
      message: 'Address removed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// ==================== CUSTOMER ORDERING & TRACKING ====================

// @desc    Place a customer delivery order
// @route   POST /api/customer/orders
// @access  Private (Customer only)
exports.createCustomerOrder = async (req, res, next) => {
  const { items, addressId, manualAddress, paymentMethod = 'Cash', notes = '' } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Your cart is empty. Please add items to order.' });
  }

  try {
    // Resolve delivery address
    let resolvedAddress = null;

    if (addressId) {
      const savedAddress = await CustomerAddress.findOne({
        _id: addressId,
        customer: req.user._id,
      });
      if (!savedAddress) {
        return res.status(400).json({ success: false, message: 'Selected delivery address not found.' });
      }
      resolvedAddress = {
        fullName: savedAddress.fullName,
        phone: savedAddress.phone,
        houseNumber: savedAddress.houseNumber,
        streetName: savedAddress.streetName,
        area: savedAddress.area,
        city: savedAddress.city,
        district: savedAddress.district,
        state: savedAddress.state,
        postalCode: savedAddress.postalCode,
        landmark: savedAddress.landmark,
        deliveryInstructions: savedAddress.deliveryInstructions,
        coordinates: savedAddress.coordinates || { latitude: null, longitude: null },
      };
    } else if (manualAddress) {
      if (
        !manualAddress.fullName ||
        !manualAddress.phone ||
        !manualAddress.houseNumber ||
        !manualAddress.streetName ||
        !manualAddress.area ||
        !manualAddress.city ||
        !manualAddress.state ||
        !manualAddress.postalCode
      ) {
        return res.status(400).json({
          success: false,
          message: 'All required delivery address fields must be provided.',
        });
      }

      // Try geocoding manual address
      let coords = { latitude: null, longitude: null };
      try {
        const geoRes = await mapService.geocodeAddress(manualAddress);
        if (geoRes?.latitude && geoRes?.longitude) {
          coords = { latitude: geoRes.latitude, longitude: geoRes.longitude };
        }
      } catch (e) {
        console.warn('[Order] Geocode error:', e.message);
      }

      resolvedAddress = {
        fullName: manualAddress.fullName.trim(),
        phone: manualAddress.phone.trim(),
        houseNumber: manualAddress.houseNumber.trim(),
        streetName: manualAddress.streetName.trim(),
        area: manualAddress.area.trim(),
        city: manualAddress.city.trim(),
        district: manualAddress.district ? manualAddress.district.trim() : '',
        state: manualAddress.state.trim(),
        postalCode: manualAddress.postalCode.toString().trim(),
        landmark: manualAddress.landmark ? manualAddress.landmark.trim() : '',
        deliveryInstructions: manualAddress.deliveryInstructions ? manualAddress.deliveryInstructions.trim() : '',
        coordinates: coords,
      };
    } else {
      return res.status(400).json({
        success: false,
        message: 'A delivery address is required to place an order.',
      });
    }

    // Process & validate cart items
    let calculatedSubtotal = 0;
    const finalItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId || item.product || item._id);
      if (!product) {
        return res.status(404).json({ success: false, message: `Product ${item.name} not found.` });
      }

      if (product.status !== 'active') {
        return res.status(400).json({ success: false, message: `Product ${product.name} is currently unavailable.` });
      }

      const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
      const unitPrice = product.price;
      const itemTotal = Number((unitPrice * quantity).toFixed(2));
      calculatedSubtotal += itemTotal;

      finalItems.push({
        product: product._id,
        name: product.name,
        price: unitPrice,
        originalPrice: unitPrice,
        costPrice: product.costPrice || 0,
        quantity,
        taxPercentage: product.taxPercentage || 0,
        total: itemTotal,
      });
    }

    // Get settings for tax
    const settings = await BusinessSettings.findOne();
    const defaultTaxRate = settings ? settings.taxPercentage : 5;

    const subtotal = Number(calculatedSubtotal.toFixed(2));
    const calculatedTax = Number((subtotal * (defaultTaxRate / 100)).toFixed(2));
    const grandTotal = Number((subtotal + calculatedTax).toFixed(2));

    const orderNumber = await generateOrderNumber();
    const confirmationCode = Math.floor(1000 + Math.random() * 9000).toString();

    // Create delivery order
    const order = await Order.create({
      orderNumber,
      customer: null,
      customerUser: req.user._id,
      customerDetails: {
        name: resolvedAddress.fullName,
        phone: resolvedAddress.phone,
      },
      items: finalItems,
      subtotal,
      discount: 0,
      tax: calculatedTax,
      grandTotal,
      paymentMethod: ['Cash', 'UPI', 'Card'].includes(paymentMethod) ? paymentMethod : 'Cash',
      paymentStatus: paymentMethod === 'Cash' ? 'Pending' : 'Paid',
      cashier: null,
      cashierName: 'Online Customer',
      status: 'In Progress',
      orderType: 'delivery',
      deliveryStatus: 'order_placed',
      deliveryAddress: resolvedAddress,
      deliveryConfirmationCode: confirmationCode,
      estimatedDeliveryMinutes: 35,
      notes: notes.trim(),
      source: 'customer_portal',
    });

    // Create initial timeline event
    await DeliveryEvent.create({
      order: order._id,
      actor: req.user._id,
      actorName: req.user.name,
      actorRole: 'customer',
      eventType: 'ORDER_PLACED',
      previousStatus: '',
      newStatus: 'order_placed',
      notes: `Order placed online by customer ${req.user.name}. Delivery destination: ${resolvedAddress.city}.`,
    });

    // Send confirmation email
    emailService
      .sendOrderConfirmationEmail({
        to: req.user.email,
        order,
      })
      .catch((err) => console.error('[Order] Confirmation email failed:', err.message));

    res.status(201).json({
      success: true,
      message: 'Order placed successfully! We are preparing your order.',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders belonging to authenticated customer
// @route   GET /api/customer/orders
// @access  Private (Customer only)
exports.getCustomerOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ customerUser: req.user._id })
      .populate('deliveryPartner', 'name phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get order tracking and timeline for authenticated customer
// @route   GET /api/customer/orders/:id
// @access  Private (Customer only)
exports.getCustomerOrderById = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      customerUser: req.user._id,
    }).populate('deliveryPartner', 'name phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or you are not authorized to view it.',
      });
    }

    // Retrieve timeline events for this order
    const events = await DeliveryEvent.find({ order: order._id }).sort({ timestamp: 1 });

    res.json({
      success: true,
      data: {
        order,
        events,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel an order before dispatch
// @route   POST /api/customer/orders/:id/cancel
// @access  Private (Customer only)
exports.cancelCustomerOrder = async (req, res, next) => {
  const { reason = 'Cancelled by customer' } = req.body;

  try {
    const order = await Order.findOne({
      _id: req.params.id,
      customerUser: req.user._id,
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Business rule: Can cancel only in 'order_placed' or 'confirmed'
    if (!['order_placed', 'confirmed'].includes(order.deliveryStatus)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled because it is already '${order.deliveryStatus.replace('_', ' ')}'. Please contact customer support.`,
      });
    }

    order.deliveryStatus = 'cancelled';
    order.status = 'Cancelled';
    await order.save();

    await DeliveryEvent.create({
      order: order._id,
      actor: req.user._id,
      actorName: req.user.name,
      actorRole: 'customer',
      eventType: 'CANCELLED',
      previousStatus: order.deliveryStatus,
      newStatus: 'cancelled',
      notes: `Order cancelled by customer. Reason: ${reason}`,
    });

    res.json({
      success: true,
      message: 'Order has been cancelled.',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};
