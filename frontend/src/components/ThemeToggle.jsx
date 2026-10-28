import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const THEME_OPTIONS = [
  {
    id: 'light',
    label: 'Light',
    description: 'Crisp, high-contrast light theme',
    icon: Sun,
  },
  {
    id: 'dark',
    label: 'Dark',
    description: 'Sleek, eye-friendly dark theme',
    icon: Moon,
  },
  {
    id: 'system',
    label: 'System',
    description: 'Synchronizes with your device settings',
    icon: Monitor,
  },
];

const ThemeToggle = ({ variant = 'dropdown', className = '', showLabels = true }) => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Active theme icon
  const CurrentIcon =
    theme === 'light'
      ? Sun
      : theme === 'dark'
      ? Moon
      : Monitor;

  // Segmented Pill Variant (e.g. for Settings & Profile)
  if (variant === 'segmented') {
    return (
      <div
        role="radiogroup"
        aria-label="Theme selection"
        className={`inline-flex items-center p-1 bg-gray-100 dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 ${className}`}
      >
        {THEME_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = theme === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setTheme(opt.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm shadow-gray-900/5'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isSelected ? (opt.id === 'dark' ? 'text-indigo-400' : opt.id === 'light' ? 'text-amber-500' : 'text-brand') : ''}`} />
              {showLabels && <span>{opt.label}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  // Cards Variant (detailed option selection for Settings)
  if (variant === 'cards') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3.5 ${className}`}>
        {THEME_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = theme === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTheme(opt.id)}
              className={`flex flex-col text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer relative ${
                isSelected
                  ? 'bg-brand/5 dark:bg-brand/10 border-brand text-gray-900 dark:text-white shadow-sm ring-2 ring-brand/20'
                  : 'bg-white dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isSelected
                      ? 'bg-brand text-white shadow-md shadow-brand/30'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                {isSelected && (
                  <span className="w-5 h-5 rounded-full bg-brand text-white flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                )}
              </div>
              <h4 className="font-bold text-sm text-gray-900 dark:text-white font-display">
                {opt.label} Mode
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-snug">
                {opt.description}
              </p>
              {opt.id === 'system' && (
                <span className="mt-2 text-[10px] font-semibold text-brand tracking-wide">
                  Active OS: {resolvedTheme}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Dropdown Variant (default for Navbar)
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`Theme: currently ${theme} mode`}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200/80 dark:border-gray-700/80 bg-gray-100/70 dark:bg-gray-800/80 text-gray-700 dark:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-700/70 transition-colors focus:outline-none focus:ring-2 focus:ring-brand/30 cursor-pointer"
        title={`Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)} (Click to switch)`}
      >
        <CurrentIcon
          className={`w-4 h-4 transition-transform duration-300 ${
            theme === 'light'
              ? 'text-amber-500'
              : theme === 'dark'
              ? 'text-indigo-400'
              : 'text-brand'
          }`}
        />
        {showLabels && (
          <span className="hidden sm:inline text-xs font-bold capitalize">
            {theme}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-48 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
            Appearance
          </div>

          {THEME_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = theme === opt.id;
            return (
              <button
                key={opt.id}
                role="menuitem"
                type="button"
                onClick={() => {
                  setTheme(opt.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  isSelected
                    ? 'text-brand font-bold bg-green-50/60 dark:bg-emerald-950/40'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${
                      isSelected
                        ? 'text-brand'
                        : opt.id === 'light'
                        ? 'text-amber-500'
                        : opt.id === 'dark'
                        ? 'text-indigo-400'
                        : 'text-gray-400'
                    }`}
                  />
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-brand stroke-[2.5]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ThemeToggle;
