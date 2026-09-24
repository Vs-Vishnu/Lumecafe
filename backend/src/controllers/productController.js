const Product = require('../models/Product');
const Category = require('../models/Category');

// @desc    Get all products (with optional filtering, search and pagination)
// @route   GET /api/products
// @access  Private
exports.getProducts = async (req, res, next) => {
  try {
    const { search, category, status, page = 1, limit = 50 } = req.query;
    const query = {};

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Search query (matches name or SKU)
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { SKU: { $regex: search, $options: 'i' } },
      ];
    }

    const skipIndex = (page - 1) * limit;
    const total = await Product.countDocuments(query);
    
    const products = await Product.find(query)
      .populate('category', 'name')
      .skip(skipIndex)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: products.length,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Private
exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private (Admin only)
exports.createProduct = async (req, res, next) => {
  try {
    const { name, SKU, category, description, price, costPrice, taxPercentage, unit, image, status } = req.body;

    // Check SKU duplicate
    const skuExists = await Product.findOne({ SKU });
    if (skuExists) {
      return res.status(400).json({ success: false, message: 'Product SKU already exists' });
    }

    // Validate category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({ success: false, message: 'Selected category does not exist' });
    }

    const product = await Product.create({
      name,
      SKU,
      category,
      description,
      price,
      costPrice,
      taxPercentage: taxPercentage || 0,
      stockQuantity: 0,
      minStockLevel: 0,
      unit: unit || 'pcs',
      image: image || '',
      status: status || 'active',
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (Admin only)
exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const { category } = req.body;

    if (category) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(400).json({ success: false, message: 'Selected category does not exist' });
      }
    }

    // Check if SKU is changing and unique
    if (req.body.SKU && req.body.SKU !== product.SKU) {
      const skuExists = await Product.findOne({ SKU: req.body.SKU });
      if (skuExists) {
        return res.status(400).json({ success: false, message: 'Product SKU already exists' });
      }
    }

    // Apply updates
    Object.assign(product, req.body);
    const updatedProduct = await product.save();

    res.json({ success: true, data: updatedProduct });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private (Admin only)
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    await product.deleteOne();
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};
