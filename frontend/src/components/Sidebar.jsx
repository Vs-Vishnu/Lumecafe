import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ThemeToggle from './ThemeToggle';
import {
  LayoutDashboard,
  Receipt,
  ShoppingBag,
  Tags,
  Package,
  Users,
  ClipboardList,
  TrendingDown,
  BarChart2,
  UserCheck,
  Settings,
  Sparkles,
  User,
  LogOut,
  Menu,
  X
} from 'lucide-react';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/settings');
        if (response.data.success && response.data.data) {
          setSettings(response.data.data);
        }
      } catch (err) {
        console.error('Error fetching settings for Sidebar:', err);
      }
    };
    fetchSettings();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNavItems = () => {
    if (user?.role === 'customer') {
      return [
        { name: 'Browse Menu', path: '/menu', icon: <ShoppingBag className="w-5 h-5" /> },
        { name: 'My Orders', path: '/my-orders', icon: <ClipboardList className="w-5 h-5" /> },
        { name: 'Saved Addresses', path: '/addresses', icon: <Package className="w-5 h-5" /> },
      ];
    }

    if (user?.role === 'delivery_partner') {
      return [
        { name: 'Delivery Console', path: '/delivery/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      ];
    }

    // Cashier and Admin base items
    const baseItems = [
      { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { name: 'Billing', path: '/billing', icon: <Receipt className="w-5 h-5" /> },
      { name: 'Products', path: '/products', icon: <ShoppingBag className="w-5 h-5" /> },
      { name: 'Categories', path: '/categories', icon: <Tags className="w-5 h-5" /> },
      { name: 'Inventory', path: '/inventory', icon: <Package className="w-5 h-5" /> },
      { name: 'Customers', path: '/customers', icon: <Users className="w-5 h-5" /> },
      { name: 'Orders', path: '/orders', icon: <ClipboardList className="w-5 h-5" /> },
      { name: 'Delivery Fleet', path: '/admin/delivery-partners', icon: <UserCheck className="w-5 h-5" /> },
      { name: 'Delivery Assignments', path: '/admin/delivery-assignments', icon: <Package className="w-5 h-5" /> },
      { name: 'Expenses', path: '/expenses', icon: <TrendingDown className="w-5 h-5" /> },
      { name: 'Reports', path: '/reports', icon: <BarChart2 className="w-5 h-5" /> },
    ];

    if (user?.role === 'cashier') {
      return baseItems.filter((item) => ['Billing', 'Customers', 'Orders', 'Expenses'].includes(item.name));
    }

    return baseItems;
  };

  const adminItems = [
    { name: 'Cashiers', path: '/users', icon: <UserCheck className="w-5 h-5" /> },
    { name: 'Settings', path: '/settings', icon: <Settings className="w-5 h-5" /> },
    { name: '🤖 AI Business Insights', path: '/settings?tab=ai-insights', icon: <Sparkles className="w-5 h-5 text-amber-500" /> },
  ];

  const activeStyle = 'bg-brand text-white shadow-lg shadow-brand/20';
  const inactiveStyle = 'text-gray-600 dark:text-gray-400 hover:bg-green-50 dark:hover:bg-gray-800/80 hover:text-brand dark:hover:text-emerald-400';

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-[#121824] border-r border-gray-100 dark:border-gray-800 font-sans transition-colors duration-200">
      {/* Brand logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        {settings?.logo ? (
          <img src={settings.logo} alt="Logo" className="w-10 h-10 object-contain rounded-xl shadow-md border border-gray-100 dark:border-gray-700" />
        ) : (
          <div className="flex items-center justify-center w-10 h-10 bg-brand text-white rounded-xl font-display font-black text-xl shadow-md shadow-brand/35">
            {settings?.businessName?.charAt(0).toUpperCase() || 'L'}
          </div>
        )}
        <div className="overflow-hidden">
          <span className="text-xl font-extrabold text-gray-900 dark:text-white font-display tracking-tight leading-none block truncate" title={settings?.businessName || 'LumeBills'}>
            {settings?.businessName || (
              <>Lume<span className="text-brand">Bills</span></>
            )}
          </span>
          <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-widest block mt-0.5 truncate" title={settings?.tagline || 'Fast • Simple • Accurate'}>
            {settings?.tagline || 'Fast • Simple • Accurate'}
          </span>
        </div>
      </div>

      {/* Main navigation */}
      <div className="flex-grow overflow-y-auto px-4 py-4 space-y-7">
        <div>
          <span className="px-3 text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider block mb-2">
            {user?.role === 'customer' ? 'Customer Portal' : user?.role === 'delivery_partner' ? 'Driver Console' : 'Main Menu'}
          </span>
          <nav className="space-y-1">
            {getNavItems().map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => toggleSidebar(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive ? activeStyle : inactiveStyle
                  }`
                }
              >
                {item.icon}
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {user?.role === 'admin' && (
          <div>
            <span className="px-3 text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider block mb-2">
              Administration
            </span>
            <nav className="space-y-1">
              {adminItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={() => toggleSidebar(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isActive ? activeStyle : inactiveStyle
                    }`
                  }
                >
                  {item.icon}
                  <span>{item.name}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </div>

      {/* User profile & footer */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0 bg-gray-50/50 dark:bg-gray-800/40">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
            Appearance
          </span>
          <ThemeToggle variant="segmented" showLabels={false} />
        </div>

        <div className="flex items-center gap-3 p-2 mb-3 bg-white dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700/60">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent-light dark:bg-amber-950/40 text-accent font-bold text-base border border-accent/20">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate leading-tight">
              {user?.name || 'Loading...'}
            </h4>
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 capitalize">
              {user?.role || 'Guest'}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            to="/profile"
            onClick={() => toggleSidebar(false)}
            className="flex-grow flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <User className="w-3.5 h-3.5" />
            Profile
          </Link>
          <button
            onClick={handleLogout}
            className="px-3 py-2.5 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop view */}
      <aside className="hidden lg:block w-64 h-screen fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile view backdrop & sidebar */}
      <div
        className={`fixed inset-0 z-30 lg:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => toggleSidebar(false)}
        ></div>

        {/* Sidebar Drawer */}
        <aside
          className={`absolute inset-y-0 left-0 w-64 bg-white dark:bg-[#121824] transition-transform duration-300 transform ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <SidebarContent />
        </aside>
      </div>
    </>
  );
};

export default Sidebar;
