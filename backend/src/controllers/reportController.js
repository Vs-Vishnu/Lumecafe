const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Category = require('../models/Category');
const Payment = require('../models/Payment');
const ImportHistory = require('../models/ImportHistory');
const ExcelJS = require('exceljs');

// Helper to get start and end of today
const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

// @desc    Get dashboard metrics and charts
// @route   GET /api/reports/dashboard
// @access  Private
exports.getDashboardStats = async (req, res, next) => {
  try {
    const { start, end } = getTodayRange();

    // 1. Get today's orders
    const todayOrders = await Order.find({
      date: { $gte: start, $lte: end },
      status: 'Completed',
    });

    const todaySales = todayOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const todayCount = todayOrders.length;

    // 2. Pending payments
    const pendingOrders = await Order.find({ paymentStatus: 'Pending', status: 'Completed' });
    const pendingPayments = pendingOrders.reduce((sum, o) => sum + o.grandTotal, 0);

    // 3. Product & inventory metrics
    const totalProducts = await Product.countDocuments();
    const lowStockProducts = await Product.countDocuments({
      $expr: { $lte: ['$stockQuantity', '$minStockLevel'] },
    });

    // 4. Customer counts
    const totalCustomers = await Customer.countDocuments();

    // 5. Chart 1: Last 7 days sales
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentOrders = await Order.find({
      date: { $gte: sevenDaysAgo },
      status: 'Completed',
    });

    const salesByDay = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().split('T')[0];
      salesByDay[dateString] = { date: dateString, amount: 0, orders: 0 };
    }

    recentOrders.forEach(order => {
      const dateString = order.date.toISOString().split('T')[0];
      if (salesByDay[dateString]) {
        salesByDay[dateString].amount += order.grandTotal;
        salesByDay[dateString].orders += 1;
      }
    });

    const salesLast7Days = Object.values(salesByDay).sort((a, b) => a.date.localeCompare(b.date));

    // 6. Chart 2: Sales by Category
    const categorySalesAggregate = await Order.aggregate([
      { $match: { status: 'Completed' } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productDoc',
        },
      },
      { $unwind: '$productDoc' },
      {
        $lookup: {
          from: 'categories',
          localField: 'productDoc.category',
          foreignField: '_id',
          as: 'categoryDoc',
        },
      },
      { $unwind: { path: '$categoryDoc', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$categoryDoc.name', 'Other'] },
          value: { $sum: '$items.total' },
        },
      },
      { $project: { name: '$_id', value: 1, _id: 0 } },
    ]);

    // 7. Chart 3: Payment method distribution
    const paymentDistribution = await Order.aggregate([
      { $match: { status: 'Completed' } },
      {
        $group: {
          _id: '$paymentMethod',
          value: { $sum: '$grandTotal' },
        },
      },
      { $project: { name: '$_id', value: 1, _id: 0 } },
    ]);

    // 8. Chart 4: Top selling products
    const topProducts = await Order.aggregate([
      { $match: { status: 'Completed' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          quantity: { $sum: '$items.quantity' },
          sales: { $sum: '$items.total' },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: 5 },
      { $project: { name: '$_id', quantity: 1, sales: 1, _id: 0 } },
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          todaySales: Number(todaySales.toFixed(2)),
          todayOrdersCount: todayCount,
          pendingPayments: Number(pendingPayments.toFixed(2)),
          totalProducts,
          lowStockProducts,
          totalCustomers,
        },
        charts: {
          salesLast7Days,
          categorySales: categorySalesAggregate,
          paymentDistribution,
          topProducts,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed sales report
// @route   GET /api/reports/sales
// @access  Private
exports.getSalesReport = async (req, res, next) => {
  try {
    const { startDate, endDate, paymentMethod, status = 'Completed' } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const orders = await Order.find(query)
      .populate('customer', 'name phone')
      .populate('cashier', 'name')
      .sort({ date: -1 });

    const totalSales = orders.reduce((sum, o) => sum + o.grandTotal, 0);
    const numOrders = orders.length;
    const avgOrderValue = numOrders > 0 ? totalSales / numOrders : 0;
    const totalDiscount = orders.reduce((sum, o) => sum + o.discount, 0);
    const totalTax = orders.reduce((sum, o) => sum + o.tax, 0);
    const netSales = totalSales - totalTax; // Exclusive of taxes

    res.json({
      success: true,
      stats: {
        totalSales: Number(totalSales.toFixed(2)),
        numberOrders: numOrders,
        averageOrderValue: Number(avgOrderValue.toFixed(2)),
        totalDiscount: Number(totalDiscount.toFixed(2)),
        totalTax: Number(totalTax.toFixed(2)),
        netSales: Number(netSales.toFixed(2)),
      },
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get top-performing products report
// @route   GET /api/reports/products
// @access  Private
exports.getProductPerformanceReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const match = { status: 'Completed' };

    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        match.date.$lte = end;
      }
    }

    const report = await Order.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          quantitySold: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.total' },
          cost: { $sum: { $multiply: ['$items.costPrice', '$items.quantity'] } },
        },
      },
      {
        $addFields: {
          profit: { $subtract: ['$revenue', '$cost'] },
        },
      },
      { $sort: { quantitySold: -1 } },
    ]);

    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment method reports
// @route   GET /api/reports/payments
// @access  Private
exports.getPaymentMethodReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const match = { status: 'Completed' };

    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        match.date.$lte = end;
      }
    }

    const report = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          amount: { $sum: '$grandTotal' },
        },
      },
      { $project: { name: '$_id', count: 1, amount: 1, _id: 0 } },
    ]);

    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

// @desc    Export sales report to Excel (.xlsx) - Admin Only
// @route   GET /api/reports/export/excel
// @access  Private (Admin Only)
exports.exportSalesReportExcel = async (req, res, next) => {
  try {
    const { startDate, endDate, paymentMethod, status = 'Completed' } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const orders = await Order.find(query)
      .populate('customer', 'name phone')
      .populate('cashier', 'name')
      .sort({ date: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    // Title Row
    worksheet.mergeCells('A1', 'M1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'LumeBills Sales Report';
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 30;

    // Subtitle / Date Row
    worksheet.mergeCells('A2', 'M2');
    const subtitleCell = worksheet.getCell('A2');
    const todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    subtitleCell.value = `Generated Date: ${todayStr} | Total Records: ${orders.length}`;
    subtitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF4B5563' } };
    subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(2).height = 20;

    // Blank row
    worksheet.getRow(3).height = 10;

    // Headers Row
    const headers = [
      'Bill No', 'Date', 'Time', 'Customer Name', 'Customer Contact', 
      'Items Count', 'Original Amount (₹)', 'Item Savings (₹)', 'Order Discount (₹)', 'Tax (₹)', 'Grand Total (₹)', 
      'Payment Mode', 'Cashier', 'Status'
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'medium', color: { argb: 'FF111827' } },
      };
    });

    // Add Data Rows
    orders.forEach((order) => {
      const orderDate = new Date(order.date || order.createdAt);
      const dateStr = orderDate.toLocaleDateString('en-IN');
      const timeStr = orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      const itemsCount = order.items.reduce((s, i) => s + i.quantity, 0);
      const itemSavings = order.items.reduce((s, i) => s + (i.discountAmount || 0) * i.quantity, 0);
      const originalAmount = order.subtotal + itemSavings;

      const row = worksheet.addRow([
        order.orderNumber,
        dateStr,
        timeStr,
        order.customerDetails?.name || 'Walk-in Customer',
        order.customerDetails?.phone || '',
        itemsCount,
        originalAmount,
        itemSavings,
        order.discount,
        order.tax,
        order.grandTotal,
        order.paymentMethod,
        order.cashierName || 'Staff',
        order.status
      ]);

      row.height = 20;
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 10 };
        cell.alignment = { vertical: 'middle' };
        if ([6, 7, 8, 9, 10].includes(colNumber)) {
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        }
      });
    });

    // Set Column Widths
    worksheet.columns = [
      { width: 16 }, // Bill No
      { width: 14 }, // Date
      { width: 12 }, // Time
      { width: 24 }, // Customer Name
      { width: 16 }, // Customer Contact
      { width: 14 }, // Items Count
      { width: 15 }, // Subtotal
      { width: 14 }, // Discount
      { width: 12 }, // Tax
      { width: 16 }, // Grand Total
      { width: 15 }, // Payment Mode
      { width: 18 }, // Cashier
      { width: 14 }, // Status
    ];

    const filenameDate = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=LumeBills_Report_${filenameDate}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a report record (order document) - Admin Only
// @route   DELETE /api/reports/orders/:id
// @access  Private (Admin Only)
exports.deleteReportOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Report order record not found.' });
    }

    // Delete associated payment record
    await Payment.deleteMany({ order: order._id });

    // Delete order
    await Order.findByIdAndDelete(order._id);

    res.json({
      success: true,
      message: `Report order #${order.orderNumber} deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Import sales report data from Excel JSON payload (Admin Only)
// @route   POST /api/reports/import
// @access  Private (Admin Only)
exports.importSalesReportExcel = async (req, res, next) => {
  try {
    const { fileName, rows, totalRows, validRows, invalidRows } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid sales records provided to import.',
      });
    }

    // 1. Create Import History entry
    const importHistory = await ImportHistory.create({
      fileName: fileName || 'sales_import.xlsx',
      totalRows: totalRows || rows.length,
      validRows: validRows || rows.length,
      invalidRows: invalidRows || 0,
      importedBy: req.user._id,
      importedByName: req.user.name || 'Admin',
    });

    // 2. Lookup existing products or match by name
    const existingProducts = await Product.find({});
    const productMap = new Map();
    existingProducts.forEach((p) => {
      productMap.set(p.name.trim().toLowerCase(), p);
    });

    const categories = await Category.find({});
    const defaultCategory = categories[0] ? categories[0]._id : null;

    const ordersToInsert = [];
    const baseCount = await Order.countDocuments({ source: 'excel_import' });
    let counter = 1000 + baseCount;

    for (const item of rows) {
      counter++;
      const prodName = (item.productName || item.product || 'Unknown Product').trim();
      let prodDoc = productMap.get(prodName.toLowerCase());

      if (!prodDoc) {
        const prodNameLower = prodName.toLowerCase();
        const matchedCat = categories.find((c) =>
          prodNameLower.includes(c.name.trim().toLowerCase()) ||
          c.name.trim().toLowerCase().includes(prodNameLower)
        );
        const categoryToAssign = matchedCat ? matchedCat._id : defaultCategory;

        prodDoc = await Product.create({
          name: prodName,
          SKU: `IMP-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
          category: categoryToAssign,
          price: Number(item.price || item.sellingPrice || 0),
          costPrice: Number(item.costPrice || (item.price || item.sellingPrice || 0) * 0.7),
          status: 'active',
        });
        productMap.set(prodName.toLowerCase(), prodDoc);
      }

      const qty = Number(item.quantity || 1);
      const price = Number(item.sellingPrice || item.price || prodDoc.price || 0);
      const itemTotal = Number(item.totalAmount || item.total || qty * price);
      const costPrice = prodDoc.costPrice || price * 0.7;

      let orderDate = new Date();
      if (item.date) {
        const rawDateStr = String(item.date).trim();
        const rawTimeStr = item.time ? String(item.time).trim() : '12:00';

        if (!isNaN(Date.parse(rawDateStr))) {
          const dt = new Date(rawDateStr);
          if (item.time && typeof item.time === 'string' && item.time.includes(':')) {
            const parts = item.time.split(':');
            dt.setHours(parseInt(parts[0], 10) || 0, parseInt(parts[1], 10) || 0, 0, 0);
          }
          orderDate = dt;
        } else if (rawDateStr.includes('-') || rawDateStr.includes('/')) {
          const combined = `${rawDateStr} ${rawTimeStr}`;
          const dt = new Date(combined);
          if (!isNaN(dt.getTime())) orderDate = dt;
        }
      }

      const orderNumber = item.billNumber
        ? String(item.billNumber).trim()
        : `IMP-${Date.now().toString().slice(-6)}-${counter}`;

      ordersToInsert.push({
        orderNumber,
        customerDetails: {
          name: item.customerName || 'Walk-in Customer',
          phone: '',
        },
        items: [
          {
            product: prodDoc._id,
            name: prodDoc.name,
            price: price,
            costPrice: costPrice,
            quantity: qty,
            taxPercentage: 0,
            total: itemTotal,
          },
        ],
        subtotal: itemTotal,
        discount: 0,
        tax: 0,
        grandTotal: itemTotal,
        paymentMethod: ['Cash', 'UPI', 'Card'].includes(item.paymentMethod) ? item.paymentMethod : 'Cash',
        paymentStatus: 'Paid',
        cashier: req.user._id,
        cashierName: `${req.user.name || 'Admin'} (Import)`,
        status: 'Completed',
        source: 'excel_import',
        importBatch: importHistory._id,
        date: orderDate,
        createdAt: orderDate,
        updatedAt: orderDate,
      });
    }

    const insertedOrders = await Order.insertMany(ordersToInsert);

    res.status(201).json({
      success: true,
      message: `Successfully imported ${insertedOrders.length} sales records.`,
      batchId: importHistory._id,
      count: insertedOrders.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete imported Excel test data safely (Admin Only)
// @route   DELETE /api/reports/imported-data
// @access  Private (Admin Only)
exports.deleteImportedData = async (req, res, next) => {
  try {
    const { batchId } = req.query;
    const query = { source: 'excel_import' };

    if (batchId) {
      query.importBatch = batchId;
    }

    const result = await Order.deleteMany(query);

    if (batchId) {
      await ImportHistory.findByIdAndDelete(batchId);
    } else {
      await ImportHistory.deleteMany({});
    }

    res.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} imported test data records. Real billing data remains untouched.`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get import history logs (Admin Only)
// @route   GET /api/reports/import/history
// @access  Private (Admin Only)
exports.getImportHistory = async (req, res, next) => {
  try {
    const history = await ImportHistory.find().sort({ importedAt: -1 }).limit(20);
    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};

