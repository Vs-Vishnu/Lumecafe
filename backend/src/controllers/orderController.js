const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Payment = require('../models/Payment');
const InventoryTransaction = require('../models/InventoryTransaction');
const BusinessSettings = require('../models/BusinessSettings');

// Helper to generate next order number
const generateOrderNumber = async () => {
  let settings = await BusinessSettings.findOne();
  if (!settings) {
    settings = await BusinessSettings.create({});
  }

  const prefix = settings.invoicePrefix || 'LB';
  const number = settings.nextInvoiceNumber || 1;
  const formattedNumber = String(number).padStart(6, '0');

  // Increment invoice number in settings
  settings.nextInvoiceNumber = number + 1;
  await settings.save();

  return `${prefix}-${formattedNumber}`;
};

// @desc    Create a new order
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res, next) => {
  const { customerId, items, discount = 0, paymentMethod, paymentStatus = 'Paid', notes, cashReceived = 0 } = req.body;

  try {
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart cannot be empty.' });
    }

    if (!['Cash', 'UPI', 'Card'].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method.' });
    }

    let customer = null;
    let customerName = 'Walk-in Customer';
    let customerPhone = '';

    if (customerId) {
      customer = await Customer.findById(customerId);
      if (!customer) {
        return res.status(404).json({ success: false, message: 'Customer not found.' });
      }
      customerName = customer.name;
      customerPhone = customer.phone;
    }

    let calculatedSubtotal = 0;
    const finalItems = [];

    // Loop and validate products
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ success: false, message: `Product ${item.name} not found.` });
      }

      if (product.status !== 'active') {
        return res.status(400).json({ success: false, message: `Product ${product.name} is inactive and cannot be sold.` });
      }

      const origPrice = Number(item.originalPrice !== undefined ? item.originalPrice : product.price);
      const unitPrice = Number(item.price !== undefined ? item.price : product.price);
      const unitDiscount = Number(item.discountAmount !== undefined ? item.discountAmount : Math.max(0, origPrice - unitPrice));
      const origItemTotal = Number((origPrice * item.quantity).toFixed(2));
      const itemTotal = Number((unitPrice * item.quantity).toFixed(2));
      
      calculatedSubtotal += origItemTotal;

      // Add to final list with snapshots
      finalItems.push({
        product: product._id,
        name: product.name,
        originalPrice: origPrice,
        discountAmount: unitDiscount > 0 ? Number(unitDiscount.toFixed(2)) : 0,
        price: unitPrice,
        costPrice: product.costPrice || 0,
        quantity: item.quantity,
        taxPercentage: product.taxPercentage || 0,
        total: itemTotal,
      });
    }

    // Get settings tax rate
    const settings = await BusinessSettings.findOne();
    const defaultTaxRate = settings ? settings.taxPercentage : 5;

    // Calculations
    const subtotal = Number(calculatedSubtotal.toFixed(2));
    const taxableAmount = Math.max(0, subtotal - discount);
    const calculatedTax = Number((taxableAmount * (defaultTaxRate / 100)).toFixed(2));
    const grandTotal = Number((taxableAmount + calculatedTax).toFixed(2));

    // Cash validation
    if (paymentMethod === 'Cash' && cashReceived < grandTotal) {
      return res.status(400).json({
        success: false,
        message: `Amount received (${cashReceived}) is less than the total bill (${grandTotal}).`,
      });
    }

    // Generate Order Number
    const orderNumber = await generateOrderNumber();

    // Create Order
    const order = await Order.create({
      orderNumber,
      customer: customer ? customer._id : null,
      customerDetails: {
        name: customerName,
        phone: customerPhone,
      },
      items: finalItems,
      subtotal,
      discount,
      tax: calculatedTax,
      grandTotal,
      paymentMethod,
      paymentStatus,
      cashier: req.user._id,
      cashierName: req.user.name,
      status: 'Completed',
      notes,
    });

    // Create Payment record
    const payment = await Payment.create({
      order: order._id,
      amount: grandTotal,
      method: paymentMethod,
      status: paymentStatus === 'Paid' ? 'Completed' : 'Pending',
    });


    res.status(201).json({
      success: true,
      message: 'Order created successfully.',
      data: order,
      change: paymentMethod === 'Cash' ? Number((cashReceived - grandTotal).toFixed(2)) : 0,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get orders history
// @route   GET /api/orders
// @access  Private
exports.getOrders = async (req, res, next) => {
  try {
    const { search, status, paymentMethod, startDate, endDate, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'customerDetails.name': { $regex: search, $options: 'i' } },
        { 'customerDetails.phone': { $regex: search, $options: 'i' } },
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        // Extend to end of the day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const skipIndex = (page - 1) * limit;
    const total = await Order.countDocuments(query);

    const orders = await Order.find(query)
      .populate('customer', 'name phone')
      .populate('cashier', 'name')
      .skip(skipIndex)
      .limit(Number(limit))
      .sort({ date: -1 });

    res.json({
      success: true,
      count: orders.length,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get order details
// @route   GET /api/orders/:id
// @access  Private
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name phone email address')
      .populate('cashier', 'name');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status (Refund or Cancel)
// @route   PUT /api/orders/:id/status
// @access  Private (Admin only or authorized cashiers)
exports.updateOrderStatus = async (req, res, next) => {
  const { status } = req.body;

  if (!['Completed', 'Cancelled', 'Refunded'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid order status.' });
  }

  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Prevent re-updating refunded/cancelled orders
    if (order.status === status) {
      return res.status(400).json({ success: false, message: `Order status is already ${status}` });
    }

    const previousStatus = order.status;

    // Update status
    order.status = status;
    
    // If order was refunded/cancelled, update associated payment status
    if ((status === 'Refunded' || status === 'Cancelled') && previousStatus === 'Completed') {
      await Payment.findOneAndUpdate({ order: order._id }, { status: 'Failed' });
      order.paymentStatus = 'Failed';
    }

    // If changing from Refunded/Cancelled back to Completed
    if (status === 'Completed' && (previousStatus === 'Refunded' || previousStatus === 'Cancelled')) {
      await Payment.findOneAndUpdate({ order: order._id }, { status: 'Completed' });
      order.paymentStatus = 'Paid';
    }

    const updatedOrder = await order.save();
    res.json({ success: true, message: `Order status updated to ${status}`, data: updatedOrder });

  } catch (error) {
    next(error);
  }
};
