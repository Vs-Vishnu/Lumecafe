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
    success: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center p-4 border rounded-xl shadow-lg max-w-sm transition-all duration-300 transform scale-100 ${styles[type]}`}>
      <div className="flex-shrink-0 mr-3">{icons[type]}</div>
      <div className="text-sm font-medium mr-6">{message}</div>
      <button
        onClick={onClose}
        className="flex-shrink-0 ml-auto p-1 rounded-full hover:bg-gray-200/50 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;
