import React, { useState, useEffect } from 'react';
import { Menu, Calendar, Clock } from 'lucide-react';
import api from '../services/api';
import ThemeToggle from './ThemeToggle';

const Navbar = ({ toggleSidebar }) => {
  const [businessName, setBusinessName] = useState('LumeBills');
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    // Fetch settings for business name
    const fetchSettings = async () => {
      try {
        const response = await api.get('/settings');
        if (response.data.success && response.data.data) {
          setBusinessName(response.data.data.businessName || 'LumeBills');
        }
      } catch (err) {
        console.error('Error fetching settings for Navbar:', err);
      }
    };
    fetchSettings();

    // Clock timer
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <header className="bg-white dark:bg-[#121824] border-b border-gray-100 dark:border-gray-800/80 px-6 py-4 flex items-center justify-between sticky top-0 z-20 flex-shrink-0 transition-colors duration-200">
      <div className="flex items-center gap-3">
        <button
          onClick={() => toggleSidebar(true)}
          className="lg:hidden p-2 -ml-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-extrabold text-gray-900 dark:text-white font-display hidden sm:block">
          {businessName}
        </h1>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-semibold">
        <div className="flex items-center gap-1.5 bg-gray-100/70 dark:bg-gray-800/80 px-3.5 py-1.5 rounded-xl border border-gray-200/50 dark:border-gray-700/60">
          <Calendar className="w-4 h-4 text-brand" />
          <span className="hidden md:inline">{formatDate(time)}</span>
          <span className="md:hidden">
            {time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 bg-gray-100/70 dark:bg-gray-800/80 px-3.5 py-1.5 rounded-xl border border-gray-200/50 dark:border-gray-700/60">
          <Clock className="w-4 h-4 text-accent" />
          <span>{formatTime(time)}</span>
        </div>

        {/* Theme Mode Toggle */}
        <ThemeToggle variant="dropdown" />
      </div>
    </header>
  );
};

export default Navbar;
