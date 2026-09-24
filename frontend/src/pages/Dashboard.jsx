import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  AlertTriangle,
  Users,
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('₹');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [dashRes, settingsRes] = await Promise.all([
          api.get('/reports/dashboard'),
          api.get('/settings'),
        ]);

        if (dashRes.data.success) {
          setStats(dashRes.data.data.stats);
          setCharts(dashRes.data.data.charts);
        }
        if (settingsRes.data.success && settingsRes.data.data) {
          setCurrency(settingsRes.data.data.currency || '₹');
        }
      } catch (err) {
        console.error('Error fetching dashboard statistics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand"></div>
      </div>
    );
  }

  // Color arrays for chart elements
  const COLORS = ['#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280', '#06B6D4'];

  const statsCards = [
    {
      title: "Today's Sales",
      value: `${currency}${stats?.todaySales?.toFixed(2) || '0.00'}`,
      subtitle: `${stats?.todayOrdersCount || 0} orders received`,
      icon: <TrendingUp className="w-5 h-5 text-brand" />,
      bg: 'bg-green-50/50 border-green-100',
    },
    {
      title: "Pending Payments",
      value: `${currency}${stats?.pendingPayments?.toFixed(2) || '0.00'}`,
      subtitle: "Unpaid customer balance",
      icon: <Clock className="w-5 h-5 text-accent" />,
      bg: 'bg-amber-50/50 border-amber-100',
    },
    {
      title: "Low Stock Items",
      value: stats?.lowStockProducts || 0,
      subtitle: "Requires stock replenishment",
      icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
      bg: 'bg-red-50/50 border-red-100',
      highlight: (stats?.lowStockProducts || 0) > 0,
    },
    {
      title: "Total Customers",
      value: stats?.totalCustomers || 0,
      subtitle: "Profiles registered",
      icon: <Users className="w-5 h-5 text-blue-500" />,
      bg: 'bg-blue-50/50 border-blue-100',
    },
  ];

  return (
    <div className="space-y-8 font-sans">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight font-display">
          Overview Dashboard
        </h2>
        <p className="text-sm text-gray-500 font-semibold mt-0.5">
          Real-time metrics and sales performance summary
        </p>
      </div>

      {/* Cards list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((card, i) => (
          <div
            key={i}
            className={`p-6 border rounded-3xl bg-white shadow-sm flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5 ${
              card.highlight ? 'ring-2 ring-red-500/20' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                {card.title}
              </span>
              <div className={`p-2.5 rounded-xl border ${card.bg}`}>{card.icon}</div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-black text-gray-900 leading-none font-display">
                {card.value}
              </h3>
              <p className="text-xs text-gray-400 font-semibold mt-1.5">{card.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales history Area chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col">
          <div className="mb-4">
            <h4 className="text-base font-bold text-gray-900 font-display">
              Sales: Last 7 Days
            </h4>
            <p className="text-xs text-gray-400 font-medium">Daily revenue trajectory</p>
          </div>
          <div className="h-72 w-full flex-grow">
            {charts?.salesLast7Days?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.salesLast7Days} margin={{ left: -15, right: 10, top: 10 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis
                    dataKey="date"
                    stroke="#9CA3AF"
                    fontSize={10}
                    fontWeight={500}
                    tickFormatter={(val) => {
                      const parts = val.split('-');
                      return `${parts[2]}/${parts[1]}`;
                    }}
                  />
                  <YAxis stroke="#9CA3AF" fontSize={10} fontWeight={500} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E5E7EB',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}
                    formatter={(value) => [`${currency}${value.toFixed(2)}`, 'Sales']}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorSales)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm font-semibold text-gray-400">
                No sales transactions recorded in last 7 days.
              </div>
            )}
          </div>
        </div>

        {/* Category Sales Pie chart */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col">
          <div className="mb-4">
            <h4 className="text-base font-bold text-gray-900 font-display">
              Sales by Category
            </h4>
            <p className="text-xs text-gray-400 font-medium">Category-wise total sales</p>
          </div>
          <div className="h-72 w-full flex-grow relative flex items-center justify-center">
            {charts?.categorySales?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.categorySales}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {charts.categorySales.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E5E7EB',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}
                    formatter={(value) => [`${currency}${value.toFixed(2)}`, 'Sales']}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', fontWeight: 'semibold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm font-semibold text-gray-400">
                No category sales recorded.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment methods Bar Chart */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col">
          <div className="mb-4">
            <h4 className="text-base font-bold text-gray-900 font-display">
              Payment Method Distribution
            </h4>
            <p className="text-xs text-gray-400 font-medium">Sales split by mode</p>
          </div>
          <div className="h-64 w-full flex-grow">
            {charts?.paymentDistribution?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.paymentDistribution} margin={{ left: -15, right: 10, top: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} fontWeight={500} />
                  <YAxis stroke="#9CA3AF" fontSize={10} fontWeight={500} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E5E7EB',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}
                    formatter={(value) => [`${currency}${value.toFixed(2)}`, 'Revenue']}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {charts.paymentDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.name === 'Cash'
                            ? '#10B981'
                            : entry.name === 'UPI'
                            ? '#F59E0B'
                            : '#3B82F6'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm font-semibold text-gray-400">
                No payment data found.
              </div>
            )}
          </div>
        </div>

        {/* Top selling products list */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col">
          <div className="mb-4">
            <h4 className="text-base font-bold text-gray-900 font-display">
              Top Selling Products
            </h4>
            <p className="text-xs text-gray-400 font-medium">Best sellers by volume</p>
          </div>
          <div className="flex-grow overflow-y-auto space-y-4">
            {charts?.topProducts?.length > 0 ? (
              charts.topProducts.map((prod, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-green-100 text-brand text-sm font-black">
                      {idx + 1}
                    </span>
                    <div>
                      <h5 className="text-sm font-bold text-gray-900">{prod.name}</h5>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        {prod.quantity} sold
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-black text-gray-900">
                    {currency}
                    {prod.sales.toFixed(2)}
                  </span>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-sm font-semibold text-gray-400 py-10">
                No product sales statistics found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
