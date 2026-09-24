const Customer = require('../models/Customer');
const Order = require('../models/Order');

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private
exports.getCustomers = async (req, res, next) => {
  try {
    const { search } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const customers = await Customer.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: customers.length, data: customers });
  } catch (error) {
    next(error);
  }
};

// @desc    Get customer by ID with detailed purchase metrics
// @route   GET /api/customers/:id
// @access  Private
exports.getCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Retrieve order metrics
    const orders = await Order.find({ customer: customer._id }).sort({ date: -1 });

    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => {
      return order.status === 'Completed' ? sum + order.grandTotal : sum;
    }, 0);
    const lastOrder = orders.length > 0 ? orders[0] : null;

    res.json({
      success: true,
      data: {
        customer,
        metrics: {
          totalOrders,
          totalSpent,
          lastOrderDate: lastOrder ? lastOrder.date : null,
        },
        orders,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create customer
// @route   POST /api/customers
// @access  Private
exports.createCustomer = async (req, res, next) => {
  const { name, phone, email, address, notes } = req.body;

  try {
    if (phone) {
      const exists = await Customer.findOne({ phone });
      if (exists) {
        return res.status(400).json({ success: false, message: 'A customer with this phone number already exists.' });
      }
    }

    const customer = await Customer.create({ name, phone, email, address, notes });
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
exports.updateCustomer = async (req, res, next) => {
  try {
    const { name, phone, email, address, notes } = req.body;
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Validate phone uniqueness if changed
    if (phone && phone !== customer.phone) {
      const exists = await Customer.findOne({ phone });
      if (exists) {
        return res.status(400).json({ success: false, message: 'A customer with this phone number already exists.' });
      }
    }

    customer.name = name || customer.name;
    customer.phone = phone !== undefined ? phone : customer.phone;
    customer.email = email !== undefined ? email : customer.email;
    customer.address = address !== undefined ? address : customer.address;
    customer.notes = notes !== undefined ? notes : customer.notes;

    const updatedCustomer = await customer.save();
    res.json({ success: true, data: updatedCustomer });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private (Admin only)
exports.deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    await customer.deleteOne();
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    next(error);
  }
};
