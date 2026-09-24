import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Sparkles, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  DollarSign, 
  PieChart, 
  Zap,
  ShoppingBag,
  TrendingDown,
  Activity,
  BarChart3,
  CheckCircle2,
  Tag,
  Calendar,
  Percent,
  ShieldCheck,
  ChevronRight,
  Info,
  Layers,
  X,
  Play,
  Pause,
  Trash2
} from 'lucide-react';
import Toast from './Toast';
import ConfirmDialog from './ConfirmDialog';

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const AIBusinessInsights = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currency, setCurrency] = useState('₹');

  // Active Sub-tab ('overview' | 'discounts')
  const [activeTab, setActiveTab] = useState('overview');

  // Discount Recommendations & Stored Rules State
  const [discountData, setDiscountData] = useState(null);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [storedDiscounts, setStoredDiscounts] = useState([]);

  // Detail Modal State
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Admin Create Discount Form Modal State
  const [createDiscountModalOpen, setCreateDiscountModalOpen] = useState(false);
  const [confirmActivationModalOpen, setConfirmActivationModalOpen] = useState(false);

  const [discountForm, setDiscountForm] = useState({
    productId: '',
    productName: '',
    sellingPrice: 0,
    discountType: 'Percentage', // 'Percentage' or 'Fixed Amount'
    discountValue: 10,
    startDate: '',
    endDate: '',
    startTime: '14:00',
    endTime: '17:00',
    applicableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  });
  const [savingDiscount, setSavingDiscount] = useState(false);

  // Filter params
  const [preset, setPreset] = useState('30days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
  };

  const handleToastClose = () => setToastMsg(null);

  useEffect(() => {
    fetchSettings();
    fetchInsights();
    fetchDiscountRecommendations();
    fetchStoredDiscounts();
  }, [preset]);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      if (response.data.success && response.data.data) {
        setCurrency(response.data.data.currency || '₹');
      }
    } catch (err) {
      console.error('Error fetching settings for AI Insights:', err);
    }
  };

  const fetchInsights = async (isManualRefresh = false) => {
    if (preset === 'custom' && (!startDate || !endDate) && !isManualRefresh) {
      return;
    }

    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const endpoint = isManualRefresh ? '/admin/analytics/refresh' : '/admin/analytics/overview';
      const params = { preset };
      if (preset === 'custom') {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const response = isManualRefresh 
        ? await api.post(endpoint, params)
        : await api.get(endpoint, { params });

      if (response.data.success) {
        setData(response.data.data);
        if (isManualRefresh) {
          showToast('Analytics and sales forecasting updated successfully!');
          fetchDiscountRecommendations();
          fetchStoredDiscounts();
        }
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Failed to load business insights.';
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchDiscountRecommendations = async () => {
    setDiscountLoading(true);
    try {
      const params = { preset };
      if (preset === 'custom' && startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const response = await api.get('/admin/analytics/discount-recommendations', { params });
      if (response.data.success) {
        setDiscountData(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching discount recommendations:', err);
    } finally {
      setDiscountLoading(false);
    }
  };

  const fetchStoredDiscounts = async () => {
    try {
      const response = await api.get('/discounts');
      if (response.data.success) {
        setStoredDiscounts(response.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching stored discounts:', err);
    }
  };

  const handleApplyCustomDate = () => {
    if (!startDate || !endDate) {
      showToast('Please select both start and end dates.', 'error');
      return;
    }
    fetchInsights();
    fetchDiscountRecommendations();
  };

  // Open detail modal for a product recommendation
  const handleViewDetails = (recommendation) => {
    setSelectedRecommendation(recommendation);
    setDetailModalOpen(true);
  };

  // Open Admin Create Discount Form Modal
  const handleOpenCreateDiscount = (item) => {
    const today = new Date();
    const startD = item.startDate || new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endD = item.endDate || new Date(today.getTime() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const discVal = item.suggestedDiscountPct > 0 ? item.suggestedDiscountPct : 10;

    let selectedDays = ALL_DAYS;
    if (item.bestDay && item.bestDay !== '—') {
      selectedDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    }

    setDiscountForm({
      productId: item.productId,
      productName: item.productName,
      sellingPrice: item.sellingPrice,
      discountType: 'Percentage',
      discountValue: discVal,
      startDate: startD,
      endDate: endD,
      startTime: item.startTime || '14:00',
      endTime: item.endTime || '17:00',
      applicableDays: selectedDays,
    });

    if (detailModalOpen) setDetailModalOpen(false);
    setCreateDiscountModalOpen(true);
  };

  // Toggle Day Selection in Form
  const handleToggleDay = (day) => {
    setDiscountForm(prev => {
      const exists = prev.applicableDays.includes(day);
      const newDays = exists 
        ? prev.applicableDays.filter(d => d !== day)
        : [...prev.applicableDays, day];
      return { ...prev, applicableDays: newDays };
    });
  };

  // Live calculations for preview
  const getCalculatedPreview = () => {
    const origPrice = discountForm.sellingPrice || 0;
    const val = Number(discountForm.discountValue) || 0;
    let discAmt = 0;

    if (discountForm.discountType === 'Percentage') {
      discAmt = Number(((origPrice * val) / 100).toFixed(2));
    } else {
      discAmt = Math.min(origPrice, val);
    }

    const finalPrice = Number(Math.max(0, origPrice - discAmt).toFixed(2));
    const discPctLabel = discountForm.discountType === 'Percentage' ? `${val}%` : `${currency}${val}`;

    return {
      origPrice,
      discAmt,
      finalPrice,
      discPctLabel,
    };
  };

  // Proceed to Admin Confirmation Modal
  const handleProceedToConfirm = (e) => {
    e.preventDefault();
    if (!discountForm.productId || !discountForm.discountValue) {
      showToast('Please specify a valid discount value.', 'error');
      return;
    }
    if (discountForm.applicableDays.length === 0) {
      showToast('Please select at least one applicable day.', 'error');
      return;
    }
    setCreateDiscountModalOpen(false);
    setConfirmActivationModalOpen(true);
  };

  // Activate Discount in DB & Billing
  const handleActivateDiscountConfirm = async () => {
    setSavingDiscount(true);
    try {
      const response = await api.post('/discounts', {
        productId: discountForm.productId,
        discountType: discountForm.discountType,
        discountValue: discountForm.discountValue,
        startDate: discountForm.startDate,
        endDate: discountForm.endDate,
        startTime: discountForm.startTime,
        endTime: discountForm.endTime,
        applicableDays: discountForm.applicableDays,
        status: 'active',
      });

      if (response.data.success) {
        showToast(response.data.message || `Discount activated for ${discountForm.productName}!`);
        setConfirmActivationModalOpen(false);
        fetchStoredDiscounts();
        fetchDiscountRecommendations();
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Error activating discount.';
      showToast(msg, 'error');
    } finally {
      setSavingDiscount(false);
    }
  };

  // Toggle Discount Status (Pause / Resume)
  const handleToggleDiscountStatus = async (discountItem) => {
    const newStatus = discountItem.status === 'active' ? 'paused' : 'active';
    try {
      const response = await api.put(`/discounts/${discountItem._id}`, { status: newStatus });
      if (response.data.success) {
        showToast(`Discount for ${discountItem.product?.name || 'product'} ${newStatus === 'active' ? 'resumed' : 'paused'}.`);
        fetchStoredDiscounts();
      }
    } catch (err) {
      console.error(err);
      showToast('Error updating discount status.', 'error');
    }
  };

  // Delete Discount Rule
  const handleDeleteDiscountRule = async (id) => {
    try {
      const response = await api.delete(`/discounts/${id}`);
      if (response.data.success) {
        showToast('Discount rule deleted successfully.');
        fetchStoredDiscounts();
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting discount rule.', 'error');
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
        <p className="text-sm font-bold text-gray-500 animate-pulse">
          Analyzing completed sales data from MongoDB...
        </p>
      </div>
    );
  }

  const {
    healthScore = 0,
    productPerformance = { bestSelling: [], lowPerforming: [] },
    productLaunchOpportunity = null,
    peakSalesTime = {},
    revenueForecast = {},
    salesVolumeInsights = {},
    financialInsights = {},
    metadata = {},
  } = data || {};

  const isDataInsufficient = metadata?.dataStatus === 'INSUFFICIENT_DATA';
  const recommendationsList = discountData?.recommendations || [];

  const isProductDiscountActive = (productId) => {
    return storedDiscounts.some(d => 
      d.status === 'active' && 
      (typeof d.product === 'object' ? d.product?._id?.toString() : d.product?.toString()) === productId?.toString()
    );
  };

  const discountRecommendedItems = recommendationsList.filter(r => 
    r.recommendationStatus === 'Discount Recommended' && !isProductDiscountActive(r.productId) && !r.hasActiveDiscount
  );

  const previewCalc = getCalculatedPreview();

  return (
    <div className="space-y-6 font-sans">
      {toastMsg && <Toast message={toastMsg} type={toastType} onClose={handleToastClose} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-gray-900 via-gray-800 to-brand-dark p-6 rounded-3xl text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand/20 backdrop-blur-md rounded-2xl text-brand-light border border-brand/30">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-2xl font-black tracking-tight font-display">AI Business Insights</h2>
          </div>
          <p className="text-xs font-semibold text-gray-300">
            Pure Sales Analytics Engine & Data-Driven Smart Discount Activation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchInsights(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-2xl backdrop-blur-md transition-all cursor-pointer disabled:opacity-50 border border-white/10"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Recalculating...' : 'Refresh AI Engine'}
          </button>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-3 font-sans">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-brand text-white shadow-md shadow-brand/20'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-brand hover:text-brand'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Sales Overview & Forecasting
        </button>
        <button
          onClick={() => setActiveTab('discounts')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === 'discounts'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-amber-500 hover:text-amber-600'
          }`}
        >
          <Tag className="w-4 h-4" />
          🏷️ Smart Discount Recommendations
          {discountRecommendedItems.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900 ml-1">
              {discountRecommendedItems.length} Opps
            </span>
          )}
        </button>
      </div>

      {/* Global Presets & Date Filters */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="flex flex-wrap gap-2">
            {[
              { key: '7days', label: 'Last 7 Days' },
              { key: '30days', label: 'Last 30 Days' },
              { key: '90days', label: 'Last 90 Days' },
              { key: '6months', label: 'Last 6 Months' },
              { key: '1year', label: 'Last 1 Year' },
              { key: 'all', label: 'All Time' },
              { key: 'custom', label: 'Custom Range' },
            ].map(p => (
              <button
                key={p.key}
                onClick={() => setPreset(p.key)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  preset === p.key
                    ? 'bg-gray-900 border-gray-900 text-white shadow-sm'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-900 hover:text-gray-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {preset === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-1 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <button
              onClick={handleApplyCustomDate}
              className="px-4 py-1.5 bg-brand hover:bg-brand-dark text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Apply Filter
            </button>
          </div>
        )}
      </div>

      {/* Insufficient Data Banner */}
      {isDataInsufficient && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 flex items-start gap-4 text-amber-900">
          <div className="p-2.5 bg-amber-100 rounded-2xl text-amber-700 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-extrabold font-display">Insufficient Sales Data for Full Predictions</h4>
            <p className="text-xs font-medium text-amber-800 leading-relaxed">
              More completed billing transactions are required for high-accuracy demand forecasting. Analytics are currently calculated using available completed orders.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & FORECASTING                                            */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Health Score */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Business Health Score</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-gray-900 font-display">{healthScore}</span>
                  <span className="text-xs font-bold text-gray-400">/ 100</span>
                </div>
                <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  healthScore >= 75 ? 'bg-emerald-100 text-emerald-800' : healthScore >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                }`}>
                  {healthScore >= 75 ? 'Optimal Sales Activity' : healthScore >= 50 ? 'Moderate Performance' : 'Low Velocity'}
                </span>
              </div>
              <div className="p-3 bg-brand-50 border border-brand-100 rounded-2xl text-brand">
                <Zap className="w-6 h-6" />
              </div>
            </div>

            {/* Total Revenue */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Period Revenue</span>
                <span className="text-2xl font-black text-gray-900 font-display block">
                  {currency}{(financialInsights.totalRevenue || 0).toFixed(2)}
                </span>
                <span className="text-[10px] text-gray-400 font-bold">
                  {salesVolumeInsights.totalOrdersCount || 0} completed orders
                </span>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            {/* Peak Sales Hour */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Peak Selling Hour</span>
                <span className="text-xl font-black text-gray-900 font-display block">
                  {peakSalesTime.bestHour || '12:00 PM'}
                </span>
                <span className="text-[10px] text-gray-400 font-bold">
                  Best Day: {peakSalesTime.bestDay || 'Friday'}
                </span>
              </div>
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            {/* Gross Profit Margin */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Gross Profit Margin</span>
                <span className="text-2xl font-black text-gray-900 font-display block">
                  {financialInsights.profitMargin || 0}%
                </span>
                <span className="text-[10px] text-gray-400 font-bold">
                  {currency}{(financialInsights.grossProfit || 0).toFixed(2)} Profit
                </span>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl text-amber-600">
                <PieChart className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Product Launch Opportunity Box */}
          {productLaunchOpportunity && (
            <div className="bg-gradient-to-r from-brand-50 via-white to-brand-50/30 rounded-3xl p-6 border border-brand-100 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand text-white rounded-2xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 font-display">Best Product Launch Timing Opportunity</h3>
                  <p className="text-xs text-gray-500 font-medium">{productLaunchOpportunity.recommendation}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2">
                <div className="bg-white p-3 rounded-2xl border border-brand-100">
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">Optimal Launch Window</span>
                  <span className="font-extrabold text-brand-dark text-sm block mt-0.5">{productLaunchOpportunity.suggestedSlot}</span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-brand-100">
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">Category Opportunity</span>
                  <span className="font-extrabold text-gray-900 text-sm block mt-0.5">{productLaunchOpportunity.suggestedCategory}</span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-brand-100">
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">Projected Sales Lift</span>
                  <span className="font-extrabold text-emerald-600 text-sm block mt-0.5">{productLaunchOpportunity.projectedLift}</span>
                </div>
              </div>
            </div>
          )}

          {/* Hourly Sales Distribution Chart */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-gray-900 font-display">Hourly Sales Pattern</h3>
              <p className="text-xs text-gray-400 font-medium">Aggregated order volume by hour of day</p>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peakSalesTime.hourlyDistribution || []} margin={{ left: -20, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="hour" stroke="#9CA3AF" fontSize={10} fontWeight={600} />
                  <YAxis stroke="#9CA3AF" fontSize={10} fontWeight={600} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '12px', fontWeight: 'bold' }}
                    formatter={(val) => [`${val} Units Sold`, 'Volume']}
                  />
                  <Bar dataKey="sales" fill="#10B981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SMART DISCOUNT RECOMMENDATIONS                                    */}
      {/* ========================================================================= */}
      {activeTab === 'discounts' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Summary Row Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm text-center md:text-left">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Active Products</span>
              <span className="text-2xl font-black text-gray-900 font-display mt-1 block">
                {discountData?.summary?.totalProducts || 0}
              </span>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-3xl p-5 text-center md:text-left">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Discount Recommended</span>
              <span className="text-2xl font-black text-amber-900 font-display mt-1 block">
                {discountData?.summary?.discountRecommendedCount || 0}
              </span>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-5 text-center md:text-left">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Active Billing Discounts</span>
              <span className="text-2xl font-black text-emerald-900 font-display mt-1 block">
                {storedDiscounts.filter(d => d.status === 'active').length}
              </span>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm text-center md:text-left">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Avg Suggested Discount</span>
              <span className="text-2xl font-black text-gray-900 font-display mt-1 block">
                {discountData?.summary?.avgSuggestedDiscountPct || 10}%
              </span>
            </div>
          </div>

          {/* Active & Scheduled Discounts Management Section (Admin Only) */}
          {storedDiscounts.length > 0 && (
            <div className="bg-gradient-to-r from-emerald-900 via-gray-900 to-gray-800 text-white rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black font-display text-white">Active & Scheduled Billing Discounts</h3>
                    <p className="text-xs text-gray-300 font-medium">Discounts currently evaluated automatically by the Billing Section</p>
                  </div>
                </div>
                <span className="text-xs font-extrabold bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30">
                  {storedDiscounts.filter(d => d.status === 'active').length} Active Rules
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {storedDiscounts.map((disc) => (
                  <div key={disc._id} className="bg-white/10 border border-white/10 rounded-2xl p-4 space-y-3 backdrop-blur-md">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-white">{disc.product?.name || 'Product'}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        disc.status === 'active' ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30' : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                      }`}>
                        {disc.status === 'active' ? 'Active 🟢' : 'Paused ⏸️'}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-gray-300">
                      <div className="flex justify-between font-semibold">
                        <span>Discount:</span>
                        <span className="text-emerald-400 font-extrabold">
                          {disc.discountType === 'Percentage' ? `${disc.discountValue}% OFF` : `${currency}${disc.discountValue} OFF`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Timeline:</span>
                        <span className="text-white font-bold">{new Date(disc.startDate).toLocaleDateString('en-IN')} → {new Date(disc.endDate).toLocaleDateString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Time Window:</span>
                        <span className="text-white font-bold">{disc.startTime} – {disc.endTime}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-2.5">
                      <button
                        onClick={() => handleToggleDiscountStatus(disc)}
                        className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-xs font-bold text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      >
                        {disc.status === 'active' ? <Pause className="w-3 h-3 text-amber-300" /> : <Play className="w-3 h-3 text-emerald-300" />}
                        {disc.status === 'active' ? 'Pause' : 'Resume'}
                      </button>
                      <button
                        onClick={() => handleDeleteDiscountRule(disc._id)}
                        className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors cursor-pointer"
                        title="Delete Discount"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Visual Opportunity Cards */}
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-black text-gray-900 font-display flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                AI Discount Recommendations
              </h3>
              <p className="text-xs text-gray-500 font-semibold">
                AI-identified off-peak windows for optimal promotional timing (Requires Admin Approval)
              </p>
            </div>

            {discountLoading ? (
              <div className="py-12 text-center text-gray-400 space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto"></div>
                <p className="text-xs font-bold">Analyzing product sales velocity...</p>
              </div>
            ) : discountRecommendedItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {discountRecommendedItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-gradient-to-br from-amber-50/90 via-white to-amber-50/30 border border-amber-200/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 bg-amber-100 border border-amber-300 text-amber-950 text-xs font-black rounded-xl flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5" /> 🏷️ {item.productName}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        item.confidence === 'High' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        item.confidence === 'Medium' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}>
                        {item.confidence} Confidence
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-amber-900 font-display">{item.suggestedDiscountPct}% OFF</span>
                        <span className="text-xs text-gray-400 line-through font-bold">{currency}{item.sellingPrice.toFixed(2)}</span>
                        <span className="text-sm font-black text-emerald-700">{currency}{item.suggestedDiscountPrice.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-gray-700 font-semibold leading-relaxed line-clamp-2">
                        {item.reason}
                      </p>
                    </div>

                    <div className="bg-white/90 border border-amber-100 rounded-2xl p-3.5 text-xs space-y-2 font-medium">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-bold flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-amber-600" /> Timeline</span>
                        <span className="font-extrabold text-gray-900">{item.timeline}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-bold flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-600" /> Recommended Hours</span>
                        <span className="font-extrabold text-gray-900">{item.bestTime}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-bold flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-amber-600" /> Best Days</span>
                        <span className="font-extrabold text-gray-900">{item.bestDaysRange}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-amber-100/60">
                      <button
                        onClick={() => handleViewDetails(item)}
                        className="text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                      >
                        View Analysis →
                      </button>
                      <button
                        onClick={() => handleOpenCreateDiscount(item)}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Tag className="w-3.5 h-3.5" /> Create Discount
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 text-center text-emerald-900 space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <h4 className="text-base font-extrabold font-display">All Products Selling Strongly!</h4>
                <p className="text-xs font-medium text-emerald-700">No off-peak discounts are required based on current completed order demand.</p>
              </div>
            )}
          </div>

          {/* All Product Discount Table */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden space-y-0">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h4 className="text-base font-extrabold text-gray-900 font-display">Smart Discount Timeline (All Active Products)</h4>
                <p className="text-xs text-gray-400 font-semibold">Comprehensive recommendation list generated strictly from sales history</p>
              </div>
              <span className="text-xs font-semibold text-gray-400">{recommendationsList.length} Products Analyzed</span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider text-left">
                  <tr>
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">Sales Trend</th>
                    <th className="px-6 py-4">Discount Recommendation</th>
                    <th className="px-6 py-4 text-center">Discount %</th>
                    <th className="px-6 py-4">Best Day</th>
                    <th className="px-6 py-4">Best Time</th>
                    <th className="px-6 py-4">Timeline</th>
                    <th className="px-6 py-4 text-center">Confidence</th>
                    <th className="px-6 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                  {discountLoading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-gray-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto"></div>
                      </td>
                    </tr>
                  ) : recommendationsList.length > 0 ? (
                    recommendationsList.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-900">
                          <div>
                            <span className="block">{item.productName}</span>
                            <span className="text-[10px] text-gray-400 font-semibold">{currency}{item.sellingPrice.toFixed(2)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            item.salesTrend === 'Increasing' ? 'bg-emerald-100 text-emerald-800' :
                            item.salesTrend === 'Low Afternoon Sales' ? 'bg-amber-100 text-amber-800' :
                            item.salesTrend === 'Decreasing' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {item.salesTrend}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs">
                          {isProductDiscountActive(item.productId) || item.hasActiveDiscount || item.recommendationStatus === 'Discount Active' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1 w-max">
                              🟢 Discount Active
                            </span>
                          ) : item.recommendationStatus === 'Discount Recommended' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 w-max">
                              🏷️ Discount Recommended
                            </span>
                          ) : item.recommendationStatus === 'No Discount Needed' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-50 text-blue-900 border border-blue-200 flex items-center gap-1 w-max">
                              🔵 No Discount Needed
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-gray-100 text-gray-600 border border-gray-200 flex items-center gap-1 w-max">
                              ⚠️ Insufficient Data
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center font-black text-gray-900">
                          {item.suggestedDiscountPct > 0 ? `${item.suggestedDiscountPct}%` : '—'}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-gray-700">{item.bestDay}</td>
                        <td className="px-6 py-4 text-xs font-bold text-gray-700">{item.bestTime}</td>
                        <td className="px-6 py-4 text-xs text-gray-500 font-semibold">{item.timeline}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            item.confidence === 'High' ? 'bg-emerald-100 text-emerald-800' :
                            item.confidence === 'Medium' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {item.confidence}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleViewDetails(item)}
                              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              Details
                            </button>
                            {isProductDiscountActive(item.productId) || item.hasActiveDiscount || item.recommendationStatus === 'Discount Active' ? (
                              <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-extrabold rounded-lg">
                                Active 🟢
                              </span>
                            ) : item.recommendationStatus === 'Discount Recommended' ? (
                              <button
                                type="button"
                                onClick={() => handleOpenCreateDiscount(item)}
                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                              >
                                Create
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-gray-400 font-semibold">
                        No active product recommendations available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: PRODUCT RECOMMENDATION DETAILS MODAL                            */}
      {/* ========================================================================= */}
      {detailModalOpen && selectedRecommendation && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700">
                  <Tag className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 font-display">
                    {selectedRecommendation.productName} Analysis
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">Category: {selectedRecommendation.categoryName}</p>
                </div>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
              <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 block uppercase">Current Price</span>
                <span className="text-base font-black text-gray-900 mt-0.5 block">{currency}{selectedRecommendation.sellingPrice.toFixed(2)}</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 block uppercase">Cost Price</span>
                <span className="text-base font-black text-gray-900 mt-0.5 block">
                  {selectedRecommendation.costPrice > 0 ? `${currency}${selectedRecommendation.costPrice.toFixed(2)}` : 'Unassigned'}
                </span>
              </div>
              <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 block uppercase">Total Quantity Sold</span>
                <span className="text-base font-black text-gray-900 mt-0.5 block">{selectedRecommendation.totalQtySold} Units</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 block uppercase">Confidence Level</span>
                <span className="text-base font-black text-indigo-600 mt-0.5 block">{selectedRecommendation.confidence}</span>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-2 text-xs">
              <h4 className="font-extrabold text-gray-900 font-display flex items-center gap-1.5">
                <Info className="w-4 h-4 text-brand" /> Sales Velocity Explanation
              </h4>
              <p className="text-gray-700 font-medium leading-relaxed">{selectedRecommendation.reason}</p>
              {selectedRecommendation.costPriceNotice && (
                <p className="text-amber-700 text-[11px] italic font-semibold border-t border-gray-200 pt-2 mt-2">
                  ℹ️ {selectedRecommendation.costPriceNotice}
                </p>
              )}
            </div>

            {selectedRecommendation.recommendationStatus === 'Discount Recommended' && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2 text-xs">
                <h4 className="font-extrabold text-amber-900 font-display">Recommended Promotional Schedule</h4>
                <div className="grid grid-cols-2 gap-2 text-amber-900 font-medium">
                  <div><strong>Suggested Discount:</strong> {selectedRecommendation.suggestedDiscountPct}% OFF</div>
                  <div><strong>Discounted Price:</strong> {currency}{selectedRecommendation.suggestedDiscountPrice.toFixed(2)}</div>
                  <div><strong>Best Hours:</strong> {selectedRecommendation.bestTime}</div>
                  <div><strong>Best Days:</strong> {selectedRecommendation.bestDaysRange}</div>
                  <div className="col-span-2"><strong>Recommended Timeline:</strong> {selectedRecommendation.timeline}</div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-5 py-2.5 border border-gray-200 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Close
              </button>
              {isProductDiscountActive(selectedRecommendation.productId) || selectedRecommendation.hasActiveDiscount || selectedRecommendation.recommendationStatus === 'Discount Active' ? (
                <span className="px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 font-extrabold text-xs rounded-xl flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Discount Active 🟢
                </span>
              ) : selectedRecommendation.recommendationStatus === 'Discount Recommended' ? (
                <button
                  type="button"
                  onClick={() => handleOpenCreateDiscount(selectedRecommendation)}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-600/20 transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Tag className="w-4 h-4" /> Create Discount
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADMIN CREATE DISCOUNT FORM MODAL WITH LIVE PREVIEW               */}
      {/* ========================================================================= */}
      {createDiscountModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleProceedToConfirm}
            className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 font-display">Configure Billing Discount</h3>
                  <p className="text-xs text-gray-400 font-medium">Set timeline, time windows, and discount type</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateDiscountModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Target Product</label>
                <input
                  type="text"
                  readOnly
                  value={discountForm.productName}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none"
                />
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Selling Price</label>
                  <input
                    type="text"
                    readOnly
                    value={`${currency}${discountForm.sellingPrice.toFixed(2)}`}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block mb-1">Discount Type</label>
                  <select
                    value={discountForm.discountType}
                    onChange={(e) => setDiscountForm(p => ({ ...p, discountType: e.target.value }))}
                    className="w-full px-3 py-2 border border-amber-300 rounded-xl font-bold bg-amber-50/50 focus:outline-none"
                  >
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Fixed Amount">Fixed Amount ({currency})</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block mb-1">
                    Discount Value ({discountForm.discountType === 'Percentage' ? '%' : currency})
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={discountForm.discountValue}
                    onChange={(e) => setDiscountForm(p => ({ ...p, discountValue: Math.max(0, parseFloat(e.target.value) || 0) }))}
                    className="w-full px-3 py-2 border border-amber-300 rounded-xl font-black text-amber-900 bg-amber-50/50 focus:outline-none"
                  />
                </div>
              </div>

              {/* Dates & Hours */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={discountForm.startDate}
                    onChange={(e) => setDiscountForm(p => ({ ...p, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={discountForm.endDate}
                    onChange={(e) => setDiscountForm(p => ({ ...p, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Start Time (HH:MM)</label>
                  <input
                    type="text"
                    value={discountForm.startTime}
                    onChange={(e) => setDiscountForm(p => ({ ...p, startTime: e.target.value }))}
                    placeholder="e.g. 14:00"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">End Time (HH:MM)</label>
                  <input
                    type="text"
                    value={discountForm.endTime}
                    onChange={(e) => setDiscountForm(p => ({ ...p, endTime: e.target.value }))}
                    placeholder="e.g. 17:00"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>

              {/* Applicable Days Selector */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Applicable Days</label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_DAYS.map(day => {
                    const isSelected = discountForm.applicableDays.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => handleToggleDay(day)}
                        className={`px-3 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                          isSelected ? 'bg-amber-600 border-amber-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-amber-400'
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Preview Panel */}
              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-1.5 font-extrabold text-amber-900 text-xs">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Live Configuration Preview</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-amber-950">
                  <div>Original Price: <strong>{currency}{previewCalc.origPrice.toFixed(2)}</strong></div>
                  <div>Discount: <strong>{previewCalc.discPctLabel} ({currency}{previewCalc.discAmt.toFixed(2)})</strong></div>
                  <div className="col-span-2 text-sm font-black text-emerald-800">
                    Billing Price: {currency}{previewCalc.finalPrice.toFixed(2)}
                  </div>
                  <div className="col-span-2 text-[11px] text-amber-900">
                    📅 Timeline: {discountForm.startDate} to {discountForm.endDate} | ⏰ Time: {discountForm.startTime} to {discountForm.endTime}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => setCreateDiscountModalOpen(false)}
                className="px-4 py-2 border border-gray-200 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-600/20 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                Continue to Activation →
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ADMIN CONFIRMATION DIALOG (⚠ Activate Discount?)                */}
      {/* ========================================================================= */}
      <ConfirmDialog
        isOpen={confirmActivationModalOpen}
        onClose={() => setConfirmActivationModalOpen(false)}
        onConfirm={handleActivateDiscountConfirm}
        title="⚠ Activate Discount?"
        message={
          `Are you sure you want to activate this discount? Once confirmed, the Billing section will automatically apply ${currency}${previewCalc.finalPrice.toFixed(2)} (${previewCalc.discPctLabel} OFF) for ${discountForm.productName} during ${discountForm.startDate}–${discountForm.endDate} (${discountForm.startTime}–${discountForm.endTime}).`
        }
        confirmText={savingDiscount ? 'Activating...' : 'Activate Discount'}
        type="warning"
      />
    </div>
  );
};

export default AIBusinessInsights;
