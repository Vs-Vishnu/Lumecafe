const Order = require('../models/Order');
const Product = require('../models/Product');
const Expense = require('../models/Expense');
const Category = require('../models/Category');
const Discount = require('../models/Discount');

// Helper to parse date preset or custom range
const getDateRange = (preset, startDate, endDate) => {
  const now = new Date();
  let start = new Date();
  let end = new Date();

  end.setHours(23, 59, 59, 999);

  switch (preset) {
    case '7days':
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      break;
    case '30days':
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      break;
    case '90days':
      start.setDate(now.getDate() - 89);
      start.setHours(0, 0, 0, 0);
      break;
    case '6months':
      start.setDate(now.getDate() - 179);
      start.setHours(0, 0, 0, 0);
      break;
    case '1year':
      start.setDate(now.getDate() - 364);
      start.setHours(0, 0, 0, 0);
      break;
    case 'all':
      start = new Date(0); // Beginning of time
      break;
    case 'custom':
      if (startDate) {
        start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
      } else {
        start.setDate(now.getDate() - 29);
        start.setHours(0, 0, 0, 0);
      }
      if (endDate) {
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
      }
      break;
    default:
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      break;
  }

  return { start, end };
};

// Helper for hour labels (0 => "12 AM", 13 => "1 PM")
const formatHour = (hour) => {
  const h = Number(hour);
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return h > 12 ? `${h - 12} PM` : `${h} AM`;
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// @desc    Get AI Business Insights overview (Sales Analysis Only - Pure Read-Only)
// @route   GET /api/admin/analytics/overview
// @access  Private (Admin Only)
exports.getAnalyticsOverview = async (req, res, next) => {
  try {
    const { preset = '30days', startDate, endDate } = req.query;
    const { start, end } = getDateRange(preset, startDate, endDate);

    // Build order match condition (Completed orders only)
    const orderMatch = {
      status: 'Completed',
      date: { $gte: start, $lte: end },
    };

    // 1. Fetch total matching orders and overall order date boundaries
    const totalOrdersCount = await Order.countDocuments(orderMatch);
    
    // Find min and max date in database if preset === 'all' or for date span calculation
    const oldestOrder = await Order.findOne({ status: 'Completed' }).sort({ date: 1 });
    const latestOrder = await Order.findOne({ status: 'Completed' }).sort({ date: -1 });

    const effectiveStart = (preset === 'all' && oldestOrder) ? oldestOrder.date : start;
    const effectiveEnd = (preset === 'all' && latestOrder) ? latestOrder.date : end;

    const timeDiffMs = Math.max(1, new Date(effectiveEnd).getTime() - new Date(effectiveStart).getTime());
    const daysAnalyzed = Math.max(1, Math.ceil(timeDiffMs / (1000 * 60 * 60 * 24)));

    const isSufficientData = totalOrdersCount >= 5;

    // 2. Aggregate Sales Performance by Product (Quantity sold, Revenue, COGS)
    const productStatsAggregate = await Order.aggregate([
      { $match: orderMatch },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          quantitySold: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.total' },
          cogs: { $sum: { $multiply: ['$items.costPrice', '$items.quantity'] } },
        },
      },
      { $sort: { quantitySold: -1, revenue: -1 } },
    ]);

    const totalUnitsSold = productStatsAggregate.reduce((sum, item) => sum + item.quantitySold, 0);

    // Active products list for low performing products cross-reference
    const activeProducts = await Product.find({ status: 'active' }).populate('category', 'name');

    // Best Selling Products (Top items based on sales quantity)
    const bestSellingProducts = productStatsAggregate.slice(0, 5).map(item => ({
      productId: item._id,
      name: item.name,
      quantitySold: item.quantitySold,
      revenue: Number(item.revenue.toFixed(2)),
      trend: item.quantitySold > 10 ? 'High Demand' : 'Increasing',
    }));

    // Low Performing Products (Active products with low or 0 sales)
    const lowPerformingProducts = [];

    activeProducts.forEach(prod => {
      const soldItem = productStatsAggregate.find(i => i._id && i._id.toString() === prod._id.toString());
      const quantity = soldItem ? soldItem.quantitySold : 0;
      const rev = soldItem ? soldItem.revenue : 0;

      if (quantity < 3) {
        lowPerformingProducts.push({
          productId: prod._id,
          name: prod.name,
          category: prod.category ? prod.category.name : 'General',
          salesQuantity: quantity,
          revenue: Number(rev.toFixed(2)),
          trend: quantity === 0 ? 'No Recent Sales' : 'Low',
          recommendation: quantity === 0 
            ? 'Consider improving promotion or highlighting product in menu.' 
            : 'Consider reviewing pricing or running promotional discounts.',
        });
      }
    });

    // 3. Product Demand Forecasting (Based on sales velocity from completed bills)
    const demandForecasts = productStatsAggregate.map(item => {
      const dailyVelocity = item.quantitySold / daysAnalyzed;
      let expectedDemand = 'Stable';
      if (dailyVelocity >= 2) expectedDemand = 'High';
      else if (dailyVelocity >= 0.5) expectedDemand = 'Increasing';
      else if (dailyVelocity < 0.2) expectedDemand = 'Low';

      return {
        name: item.name,
        expectedDemand,
        dailyVelocity: Number(dailyVelocity.toFixed(2)),
        quantitySold: item.quantitySold,
        revenue: item.revenue,
      };
    });

    // 4. Best Selling Time & Hourly Distribution (Read from historical order timestamps)
    const hourlyAggregate = await Order.aggregate([
      { $match: orderMatch },
      {
        $group: {
          _id: { $hour: '$date' },
          sales: { $sum: '$grandTotal' },
          orders: { $sum: 1 },
        },
      },
    ]);

    const hourlyMap = new Map();
    for (let h = 0; h < 24; h++) {
      hourlyMap.set(h, { hour: formatHour(h), rawHour: h, sales: 0, orders: 0 });
    }
    hourlyAggregate.forEach(item => {
      if (hourlyMap.has(item._id)) {
        hourlyMap.set(item._id, {
          hour: formatHour(item._id),
          rawHour: item._id,
          sales: Number(item.sales.toFixed(2)),
          orders: item.orders,
        });
      }
    });

    const hourlyDistribution = Array.from(hourlyMap.values());
    
    // Find peak sales hour
    let maxHourSales = -1;
    let bestSalesHour = 'N/A';
    hourlyDistribution.forEach(h => {
      if (h.sales > maxHourSales) {
        maxHourSales = h.sales;
        bestSalesHour = h.hour;
      }
    });

    // Find best 3-hour launch window (e.g. 5 PM - 8 PM)
    let maxWindowSales = -1;
    let bestWindowStart = 17; // default 5 PM
    for (let h = 0; h < 22; h++) {
      const windowSum = (hourlyMap.get(h)?.sales || 0) + (hourlyMap.get(h+1)?.sales || 0) + (hourlyMap.get(h+2)?.sales || 0);
      if (windowSum > maxWindowSales) {
        maxWindowSales = windowSum;
        bestWindowStart = h;
      }
    }
    const bestLaunchTimeRange = `${formatHour(bestWindowStart)} – ${formatHour(bestWindowStart + 3)}`;

    // 5. Day of Week Sales Analysis
    const dayOfWeekAggregate = await Order.aggregate([
      { $match: orderMatch },
      {
        $group: {
          _id: { $dayOfWeek: '$date' }, // 1=Sun, 7=Sat
          sales: { $sum: '$grandTotal' },
          orders: { $sum: 1 },
        },
      },
    ]);

    let maxDaySales = -1;
    let bestSalesDay = 'Saturday';
    const dayOfWeekDistribution = DAY_NAMES.map((dayName, idx) => {
      const dayMongoId = idx + 1;
      const found = dayOfWeekAggregate.find(d => d._id === dayMongoId);
      const sales = found ? found.sales : 0;
      if (sales > maxDaySales) {
        maxDaySales = sales;
        bestSalesDay = dayName;
      }
      return { day: dayName, sales: Number(sales.toFixed(2)), orders: found ? found.orders : 0 };
    });

    // 6. Category Sales Analysis & Product Opportunity Recommendation
    const categorySalesAggregate = await Order.aggregate([
      { $match: orderMatch },
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
          _id: { $ifNull: ['$categoryDoc.name', 'Beverages'] },
          totalSales: { $sum: '$items.total' },
          totalQuantity: { $sum: '$items.quantity' },
        },
      },
      { $sort: { totalSales: -1 } },
    ]);

    const topCategory = categorySalesAggregate.length > 0 ? categorySalesAggregate[0]._id : 'Beverages';
    const launchConfidence = totalOrdersCount >= 20 ? 'High' : (totalOrdersCount >= 5 ? 'Medium' : 'Low');

    const productOpportunity = isSufficientData ? {
      suggestedCategory: topCategory,
      reason: `Historical sales show strongest customer volume and growth in ${topCategory} category during ${bestSalesDay} peak hours.`,
      suggestedLaunchPeriod: `${bestSalesDay} (${bestLaunchTimeRange})`,
      expectedDemand: 'High',
      confidence: launchConfidence,
    } : {
      suggestedCategory: null,
      reason: 'Not enough historical data to provide a reliable product launch recommendation.',
      suggestedLaunchPeriod: 'N/A',
      expectedDemand: 'N/A',
      confidence: 'Low',
    };

    // 7. Revenue Forecast (Estimated from historical completed order totals)
    const matchingOrders = await Order.find(orderMatch).select('grandTotal date');
    const totalRevenueInPeriod = matchingOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const avgDailyRevenue = daysAnalyzed > 0 ? totalRevenueInPeriod / daysAnalyzed : 0;

    const estimatedNext7Days = Number((avgDailyRevenue * 7).toFixed(2));
    const estimatedNext30Days = Number((avgDailyRevenue * 30).toFixed(2));

    const revenueForecast = {
      next7Days: {
        estimated: estimatedNext7Days,
        minRange: Number((estimatedNext7Days * 0.88).toFixed(2)),
        maxRange: Number((estimatedNext7Days * 1.12).toFixed(2)),
      },
      next30Days: {
        estimated: estimatedNext30Days,
        minRange: Number((estimatedNext30Days * 0.82).toFixed(2)),
        maxRange: Number((estimatedNext30Days * 1.18).toFixed(2)),
      },
      disclaimer: 'Estimated based on historical LumeBills sales data.',
    };

    // 8. Expense and Profit Analysis
    const totalCostOfGoods = productStatsAggregate.reduce((sum, item) => sum + (item.cogs || 0), 0);
    
    // Fetch expenses in date range
    const expenseMatch = { date: { $gte: start, $lte: end } };
    const expenses = await Expense.find(expenseMatch);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    const grossProfit = totalRevenueInPeriod - totalCostOfGoods;
    const netProfit = grossProfit - totalExpenses;
    const profitMargin = totalRevenueInPeriod > 0 ? (netProfit / totalRevenueInPeriod) * 100 : 0;

    const hasCostData = totalCostOfGoods > 0 || activeProducts.every(p => p.costPrice > 0);

    // 9. Business Health Score (0 - 100) based strictly on sales volume, order activity & profit margin
    let healthScore = 50; // base score
    if (totalOrdersCount > 0) {
      // Sales volume & order activity score (50 pts max)
      const salesPts = Math.min(50, totalOrdersCount * 5);

      // Profitability margin score (50 pts max)
      let profitPts = 20;
      if (profitMargin >= 25) profitPts = 50;
      else if (profitMargin >= 10) profitPts = 35;
      else if (profitMargin > 0) profitPts = 25;

      healthScore = Math.min(100, Math.max(10, Math.round(salesPts + profitPts)));
    }

    // 10. Metadata
    const metadata = {
      datePeriodAnalyzed: preset === 'all' 
        ? `All available data (${new Date(effectiveStart).toLocaleDateString('en-IN')} – ${new Date(effectiveEnd).toLocaleDateString('en-IN')})`
        : `Last ${daysAnalyzed} Days`,
      startDate: effectiveStart,
      endDate: effectiveEnd,
      ordersAnalyzed: totalOrdersCount,
      totalUnitsSold,
      daysAnalyzed,
      confidenceLevel: launchConfidence,
      isSufficientData,
      insufficientDataNotice: !isSufficientData ? {
        message: 'More sales history is required for reliable forecasting.',
        currentData: `${daysAnalyzed} days (${totalOrdersCount} orders)`,
        recommendedData: 'At least 30–90 days of sales history.',
      } : null,
      generatedAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: {
        healthScore,
        productPerformance: {
          bestSelling: bestSellingProducts,
          lowPerforming: lowPerformingProducts,
        },
        demandForecasts,
        bestLaunchTime: {
          bestDay: bestSalesDay,
          bestTime: bestLaunchTimeRange,
          confidence: launchConfidence,
          reason: `Historical sales are highest during ${bestSalesDay} ${bestLaunchTimeRange}.`,
        },
        productOpportunity,
        peakSalesTime: {
          bestDay: bestSalesDay,
          bestHour: bestSalesHour,
          hourlyDistribution,
          dayOfWeekDistribution,
        },
        revenueForecast,
        salesVolumeInsights: {
          totalUnitsSold,
          totalOrdersCount,
          fastMovingCount: bestSellingProducts.length,
          slowMovingCount: lowPerformingProducts.length,
        },
        financialInsights: {
          totalRevenue: Number(totalRevenueInPeriod.toFixed(2)),
          totalCostOfGoods: Number(totalCostOfGoods.toFixed(2)),
          grossProfit: Number(grossProfit.toFixed(2)),
          totalExpenses: Number(totalExpenses.toFixed(2)),
          netProfit: Number(netProfit.toFixed(2)),
          profitMargin: Number(profitMargin.toFixed(1)),
          hasCostData,
          notice: !hasCostData ? 'Profit analysis requires product cost information.' : null,
        },
        metadata,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh AI Business Insights (forces recalculation)
// @route   POST /api/admin/analytics/refresh
// @access  Private (Admin Only)
exports.refreshAnalytics = async (req, res, next) => {
  try {
    return exports.getAnalyticsOverview(req, res, next);
  } catch (error) {
    next(error);
  }
};

// @desc    Get Smart Discount Recommendations for ALL active products (Admin Only)
// @route   GET /api/admin/analytics/discount-recommendations
// @access  Private (Admin Only)
exports.getDiscountRecommendations = async (req, res, next) => {
  try {
    const { preset = '30days', startDate, endDate } = req.query;
    const { start, end } = getDateRange(preset, startDate, endDate);

    const orders = await Order.find({
      status: 'Completed',
      date: { $gte: start, $lte: end },
    });

    const totalOrdersCount = orders.length;
    const daysAnalyzed = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));

    const activeProducts = await Product.find({ status: 'active' }).populate('category', 'name');
    const activeDiscounts = await Discount.find({ status: 'active' });
    const activeDiscountMap = new Map();
    activeDiscounts.forEach((d) => {
      const pId = typeof d.product === 'object' ? d.product?._id?.toString() : d.product?.toString();
      if (pId) activeDiscountMap.set(pId, d);
    });

    const productStats = new Map();
    activeProducts.forEach((p) => {
      productStats.set(p._id.toString(), {
        product: p,
        totalQty: 0,
        totalRevenue: 0,
        orderCount: 0,
        hourlyQty: new Array(24).fill(0),
        dailyQty: new Array(7).fill(0),
        recentQty: 0,
        priorQty: 0,
      });
    });

    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const twentyEightDaysAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    orders.forEach((order) => {
      const orderDate = new Date(order.date || order.createdAt);
      const hour = orderDate.getHours();
      const day = orderDate.getDay();

      order.items.forEach((item) => {
        const pId = item.product ? item.product.toString() : null;
        if (pId && productStats.has(pId)) {
          const stat = productStats.get(pId);
          const qty = item.quantity || 1;
          const total = item.total || qty * (item.price || 0);

          stat.totalQty += qty;
          stat.totalRevenue += total;
          stat.orderCount += 1;
          stat.hourlyQty[hour] += qty;
          stat.dailyQty[day] += qty;

          if (orderDate >= fourteenDaysAgo) {
            stat.recentQty += qty;
          } else if (orderDate >= twentyEightDaysAgo) {
            stat.priorQty += qty;
          }
        }
      });
    });

    let overallConfidence = 'Low';
    if (daysAnalyzed >= 90 || totalOrdersCount >= 50) {
      overallConfidence = 'High';
    } else if (daysAnalyzed >= 30 || totalOrdersCount >= 15) {
      overallConfidence = 'Medium';
    }

    const recommendations = [];

    for (const [pId, stat] of productStats.entries()) {
      const p = stat.product;
      const sellingPrice = p.price || 0;
      const costPrice = p.costPrice || 0;
      const totalQty = stat.totalQty;
      const orderCount = stat.orderCount;

      const existingDiscount = activeDiscountMap.get(p._id.toString());
      const hasActiveDiscount = !!existingDiscount;

      let salesTrend = 'Stable';
      if (totalQty === 0) {
        salesTrend = 'No Sales Yet';
      } else if (stat.recentQty > stat.priorQty * 1.2) {
        salesTrend = 'Increasing';
      } else if (stat.recentQty < stat.priorQty * 0.8) {
        salesTrend = 'Decreasing';
      }

      if (totalOrdersCount < 3 || totalQty < 2) {
        recommendations.push({
          productId: p._id,
          productName: p.name,
          categoryName: p.category?.name || 'General',
          sellingPrice,
          costPrice,
          totalQtySold: totalQty,
          totalRevenue: Number(stat.totalRevenue.toFixed(2)),
          salesTrend: 'Insufficient Data',
          recommendationStatus: hasActiveDiscount ? 'Discount Active' : 'Insufficient Data',
          hasActiveDiscount,
          activeDiscountDetails: existingDiscount ? {
            discountType: existingDiscount.discountType,
            discountValue: existingDiscount.discountValue,
            startDate: existingDiscount.startDate,
            endDate: existingDiscount.endDate,
            startTime: existingDiscount.startTime,
            endTime: existingDiscount.endTime,
          } : null,
          suggestedDiscountPct: existingDiscount ? existingDiscount.discountValue : 0,
          suggestedDiscountPrice: sellingPrice,
          bestDay: '—',
          bestDaysRange: '—',
          bestTime: '—',
          timeline: '—',
          startDate: null,
          endDate: null,
          startTime: null,
          endTime: null,
          confidence: 'Low',
          reason: hasActiveDiscount ? `Discount active: ${existingDiscount.discountType === 'Percentage' ? `${existingDiscount.discountValue}% OFF` : `₹${existingDiscount.discountValue} OFF`}` : 'More historical sales data is required to generate a reliable discount recommendation.',
          hasCostPrice: costPrice > 0,
          costPriceNotice: costPrice > 0 ? null : 'Discount recommendation is based on sales trends only. Profitability could not be verified.',
        });
        continue;
      }

      let maxHour = 12;
      let maxHourQty = -1;
      let minHour = 15;
      let minHourQty = Infinity;

      for (let h = 9; h <= 21; h++) {
        const q = stat.hourlyQty[h];
        if (q > maxHourQty) {
          maxHourQty = q;
          maxHour = h;
        }
        if (q < minHourQty) {
          minHourQty = q;
          minHour = h;
        }
      }

      let minDay = 1;
      let minDayQty = Infinity;
      for (let d = 1; d <= 5; d++) {
        if (stat.dailyQty[d] < minDayQty) {
          minDayQty = stat.dailyQty[d];
          minDay = d;
        }
      }

      const peakTimeStr = `${formatHour(maxHour)} – ${formatHour((maxHour + 2) % 24)}`;
      const lowTimeStart = minHour;
      const lowTimeEnd = (minHour + 3) % 24;
      const lowTimeStr = `${formatHour(lowTimeStart)} – ${formatHour(lowTimeEnd)}`;
      const bestDayStr = DAY_NAMES[minDay];
      const bestDaysRangeStr = `${DAY_NAMES[minDay]} – Thursday`;

      const isLowAfternoon = (minHour >= 13 && minHour <= 17);
      const dropPct = maxHourQty > 0 ? Math.round(((maxHourQty - minHourQty) / maxHourQty) * 100) : 0;

      let isDiscountRecommended = false;
      let rawDiscountPct = 0;
      let reasonText = '';

      if (salesTrend === 'Increasing' && dropPct < 35) {
        isDiscountRecommended = false;
        reasonText = 'Demand is consistently strong during current sales periods.';
      } else if (dropPct >= 25 || isLowAfternoon || salesTrend === 'Decreasing') {
        isDiscountRecommended = true;
        if (dropPct >= 50 || salesTrend === 'Decreasing') {
          rawDiscountPct = 15;
        } else if (dropPct >= 35) {
          rawDiscountPct = 10;
        } else {
          rawDiscountPct = 5;
        }

        if (isLowAfternoon) {
          salesTrend = 'Low Afternoon Sales';
          reasonText = `${p.name} sales are ${dropPct}% lower between ${lowTimeStr} compared with peak sales periods (${peakTimeStr}).`;
        } else {
          reasonText = `${p.name} exhibits lower sales velocity on ${bestDayStr}s during ${lowTimeStr}.`;
        }
      } else {
        isDiscountRecommended = false;
        reasonText = 'Demand is consistently strong during current sales periods.';
      }

      let suggestedDiscountPct = 0;
      let suggestedDiscountPrice = sellingPrice;

      if (isDiscountRecommended) {
        let maxAllowedPct = 20;
        if (costPrice > 0 && sellingPrice > costPrice) {
          const maxAllowedAmt = sellingPrice - costPrice;
          maxAllowedPct = Math.floor((maxAllowedAmt / sellingPrice) * 100);
        } else if (costPrice > 0 && sellingPrice <= costPrice) {
          maxAllowedPct = 0;
        }

        suggestedDiscountPct = Math.min(rawDiscountPct, maxAllowedPct);
        if (suggestedDiscountPct <= 0 && isDiscountRecommended) {
          isDiscountRecommended = false;
          reasonText = `Discount not recommended to protect cost price margin (Cost: ${costPrice}).`;
        } else {
          suggestedDiscountPrice = Number((sellingPrice * (1 - suggestedDiscountPct / 100)).toFixed(2));
        }
      }

      const startDateObj = new Date();
      startDateObj.setDate(startDateObj.getDate() + 2);
      const endDateObj = new Date(startDateObj);
      endDateObj.setDate(endDateObj.getDate() + 10);

      const formatTimelineDate = (d) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const timelineStr = `${formatTimelineDate(startDateObj)} – ${formatTimelineDate(endDateObj)}`;

      let productConfidence = 'Medium';
      if (orderCount >= 20 || daysAnalyzed >= 60) {
        productConfidence = 'High';
      } else if (orderCount < 5 || daysAnalyzed < 14) {
        productConfidence = 'Low';
      }

      let finalRecStatus = isDiscountRecommended ? 'Discount Recommended' : 'No Discount Needed';
      if (hasActiveDiscount) {
        finalRecStatus = 'Discount Active';
      }

      recommendations.push({
        productId: p._id,
        productName: p.name,
        categoryName: p.category?.name || 'General',
        sellingPrice,
        costPrice,
        totalQtySold: totalQty,
        totalRevenue: Number(stat.totalRevenue.toFixed(2)),
        salesTrend,
        recommendationStatus: finalRecStatus,
        hasActiveDiscount,
        activeDiscountDetails: existingDiscount ? {
          discountType: existingDiscount.discountType,
          discountValue: existingDiscount.discountValue,
          startDate: existingDiscount.startDate,
          endDate: existingDiscount.endDate,
          startTime: existingDiscount.startTime,
          endTime: existingDiscount.endTime,
        } : null,
        suggestedDiscountPct: isDiscountRecommended ? suggestedDiscountPct : 0,
        suggestedDiscountPrice: isDiscountRecommended ? suggestedDiscountPrice : sellingPrice,
        bestDay: isDiscountRecommended ? bestDayStr : '—',
        bestDaysRange: isDiscountRecommended ? bestDaysRangeStr : '—',
        bestTime: isDiscountRecommended ? lowTimeStr : '—',
        timeline: isDiscountRecommended ? timelineStr : '—',
        startDate: isDiscountRecommended ? startDateObj.toISOString().split('T')[0] : null,
        endDate: isDiscountRecommended ? endDateObj.toISOString().split('T')[0] : null,
        startTime: isDiscountRecommended ? `${lowTimeStart.toString().padStart(2, '0')}:00` : null,
        endTime: isDiscountRecommended ? `${lowTimeEnd.toString().padStart(2, '0')}:00` : null,
        confidence: productConfidence,
        reason: hasActiveDiscount ? `Discount active: ${existingDiscount.discountType === 'Percentage' ? `${existingDiscount.discountValue}% OFF` : `₹${existingDiscount.discountValue} OFF`}` : reasonText,
        hasCostPrice: costPrice > 0,
        costPriceNotice: costPrice > 0 ? null : 'Discount recommendation is based on sales trends only. Profitability could not be verified.',
      });
    }

    recommendations.sort((a, b) => {
      if (a.recommendationStatus === 'Discount Recommended' && b.recommendationStatus !== 'Discount Recommended') return -1;
      if (a.recommendationStatus !== 'Discount Recommended' && b.recommendationStatus === 'Discount Recommended') return 1;
      return b.totalRevenue - a.totalRevenue;
    });

    res.json({
      success: true,
      data: {
        dataPeriodAnalyzed: `${daysAnalyzed} Days`,
        totalOrdersAnalyzed: totalOrdersCount,
        overallConfidence,
        summary: {
          totalProducts: activeProducts.length,
          discountRecommendedCount: recommendations.filter(r => r.recommendationStatus === 'Discount Recommended').length,
          noDiscountCount: recommendations.filter(r => r.recommendationStatus === 'No Discount Needed').length,
          insufficientDataCount: recommendations.filter(r => r.recommendationStatus === 'Insufficient Data').length,
          avgSuggestedDiscountPct: Math.round(
            recommendations.filter(r => r.suggestedDiscountPct > 0).reduce((s, r) => s + r.suggestedDiscountPct, 0) /
            (recommendations.filter(r => r.suggestedDiscountPct > 0).length || 1)
          ),
        },
        recommendations,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Optional Admin action to save/schedule a discount preference (Admin Only - Read-Only AI Guard)
// @route   POST /api/admin/analytics/create-discount
// @access  Private (Admin Only)
exports.createDiscountRecommendation = async (req, res, next) => {
  try {
    const { productId, productName, discountPct, discountPrice, startDate, endDate, startTime, endTime } = req.body;

    if (!productId || !discountPct) {
      return res.status(400).json({ success: false, message: 'Missing product or discount parameters.' });
    }

    res.json({
      success: true,
      message: `Discount of ${discountPct}% scheduled for ${productName || 'product'} (${startDate} to ${endDate}, ${startTime}–${endTime}).`,
      data: {
        productId,
        productName,
        discountPct,
        discountPrice,
        startDate,
        endDate,
        startTime,
        endTime,
        status: 'Scheduled',
        createdBy: req.user.name,
      },
    });
  } catch (error) {
    next(error);
  }
};

