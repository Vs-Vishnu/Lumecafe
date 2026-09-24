const Product = require('../models/Product');
const InventoryTransaction = require('../models/InventoryTransaction');

// @desc    Get current inventory status including low-stock alerts
// @route   GET /api/inventory
// @access  Private
exports.getInventoryStatus = async (req, res, next) => {
  try {
    const { search, category, lowStock } = req.query;
    const query = {};

    if (category) {
      query.category = category;
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    let products = await Product.find(query).populate('category', 'name').sort({ stockQuantity: 1 });

    // Filter by low stock if requested
    if (lowStock === 'true') {
      products = products.filter(p => p.stockQuantity <= p.minStockLevel);
    }

    const report = products.map(product => {
      return {
        _id: product._id,
        name: product.name,
        SKU: product.SKU,
        category: product.category ? product.category.name : 'N/A',
        stockQuantity: product.stockQuantity,
        minStockLevel: product.minStockLevel,
        unit: product.unit,
        isLowStock: product.stockQuantity <= product.minStockLevel,
        status: product.status,
      };
    });

    res.json({ success: true, count: report.length, data: report });
  } catch (error) {
    next(error);
  }
};

// @desc    Manually adjust inventory stock
// @route   POST /api/inventory/adjust
// @access  Private (Admin only)
exports.adjustStock = async (req, res, next) => {
  const { productId, quantity, type, reason } = req.body;

  if (!productId || quantity === undefined || !type) {
    return res.status(400).json({ success: false, message: 'productId, quantity, and transaction type are required.' });
  }

  if (!['Purchase', 'Adjustment', 'Sale', 'Return'].includes(type)) {
    return res.status(400).json({ success: false, message: 'Invalid transaction type.' });
  }

  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const prevStock = product.stockQuantity;
    const change = Number(quantity); // Can be positive or negative
    const nextStock = prevStock + change;

    if (nextStock < 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid adjustment. Stock cannot fall below 0. Current: ${prevStock}, Adjustment: ${change}`,
      });
    }

    // Save product stock
    product.stockQuantity = nextStock;
    await product.save();

    // Log transaction
    const transaction = await InventoryTransaction.create({
      product: product._id,
      type,
      quantity: change,
      previousStock: prevStock,
      newStock: nextStock,
      reason: reason || 'Manual adjustment',
      user: req.user._id,
      userName: req.user.name,
    });

    res.json({
      success: true,
      message: 'Stock adjusted successfully.',
      data: {
        product: product.name,
        previousStock: prevStock,
        newStock: nextStock,
        transaction,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get inventory transaction history logs
// @route   GET /api/inventory/transactions
// @access  Private
exports.getTransactions = async (req, res, next) => {
  try {
    const { type, productId, page = 1, limit = 50 } = req.query;
    const query = {};

    if (type) {
      query.type = type;
    }

    if (productId) {
      query.product = productId;
    }

    const skipIndex = (page - 1) * limit;
    const total = await InventoryTransaction.countDocuments(query);

    const transactions = await InventoryTransaction.find(query)
      .populate('product', 'name SKU price unit')
      .skip(skipIndex)
      .limit(Number(limit))
      .sort({ date: -1 });

    res.json({
      success: true,
      count: transactions.length,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};
