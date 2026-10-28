import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const styles = {
    success: 'bg-green-50 dark:bg-emerald-950/90 text-green-800 dark:text-emerald-200 border-green-200 dark:border-emerald-800/80 shadow-lg shadow-green-950/10',
    error: 'bg-red-50 dark:bg-rose-950/90 text-red-800 dark:text-rose-200 border-red-200 dark:border-rose-800/80 shadow-lg shadow-rose-950/10',
    info: 'bg-blue-50 dark:bg-sky-950/90 text-blue-800 dark:text-sky-200 border-blue-200 dark:border-sky-800/80 shadow-lg shadow-sky-950/10',
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500 dark:text-emerald-400" />,
    error: <AlertCircle className="w-5 h-5 text-red-500 dark:text-rose-400" />,
    info: <Info className="w-5 h-5 text-blue-500 dark:text-sky-400" />,
  };

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center p-4 border rounded-xl shadow-lg max-w-sm transition-all duration-300 transform scale-100 backdrop-blur-sm ${styles[type]}`}>
      <div className="flex-shrink-0 mr-3">{icons[type]}</div>
      <div className="text-sm font-medium mr-6">{message}</div>
      <button
        onClick={onClose}
        aria-label="Dismiss toast"
        className="flex-shrink-0 ml-auto p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;
