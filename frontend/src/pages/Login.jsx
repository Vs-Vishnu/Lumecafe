import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, User, Eye, EyeOff } from 'lucide-react';
import Toast from '../components/Toast';
import api from '../services/api';

const Login = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [logo, setLogo] = useState('');
  const [businessName, setBusinessName] = useState('LumeBills');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/settings');
        if (response.data.success && response.data.data) {
          setLogo(response.data.data.logo || '');
          setBusinessName(response.data.data.businessName || 'LumeBills');
        }
      } catch (err) {
        console.error('Error fetching settings for Login:', err);
      }
    };
    fetchSettings();
  }, []);

  const handleToastClose = () => setToastMsg(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (isRegistering) {
      if (!name || !email || !password) {
        setToastMsg('Please fill in all fields.');
        setToastType('error');
        setLoading(false);
        return;
      }
      
      const res = await register(name, email, password, 'admin');
      if (res.success) {
        setToastMsg('Admin setup successful! Logging in...');
        setToastType('success');
        setTimeout(() => navigate('/dashboard'), 1500);
      } else {
        setToastMsg(res.message);
        setToastType('error');
      }
    } else {
      if (!email || !password) {
        setToastMsg('Please enter your email and password.');
        setToastType('error');
        setLoading(false);
        return;
      }

      const res = await login(email, password);
      if (res.success) {
        setToastMsg('Login successful! Redirecting...');
        setToastType('success');
        const targetPath = res.user?.role === 'cashier' ? '/billing' : '/dashboard';
        setTimeout(() => navigate(targetPath), 1500);
      } else {

        setToastMsg(res.message);
        setToastType('error');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      {toastMsg && (
        <Toast message={toastMsg} type={toastType} onClose={handleToastClose} />
      )}

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Receipt-inspired icon logo */}
        {logo ? (
          <img src={logo} alt="Logo" className="mx-auto w-16 h-16 object-contain rounded-2xl shadow-xl border border-gray-100 bg-white p-2" />
        ) : (
          <div className="mx-auto flex items-center justify-center w-16 h-16 bg-brand text-white rounded-2xl font-display font-black text-3xl shadow-xl shadow-brand/30">
            {businessName?.charAt(0).toUpperCase() || 'L'}
          </div>
        )}
        
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 font-display tracking-tight">
          {isRegistering ? 'Admin Setup' : `Log In to ${businessName}`}
        </h2>
        <p className="mt-2 text-center text-sm font-semibold text-gray-500">
          {isRegistering
            ? 'Initialize your master administrator account'
            : 'Enter your credentials to manage your business'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-gray-200/50 rounded-3xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {isRegistering && (
              <div>
                <label className="block text-sm font-bold text-gray-700">
                  Full Name
                </label>
                <div className="mt-1.5 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <User className="h-5 w-5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700">
                Email address
              </label>
              <div className="mt-1.5 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@lumebills.com"
                  className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700">
                Password
              </label>
              <div className="mt-1.5 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-11 pr-12 py-3 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {!isRegistering && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    className="h-4.5 w-4.5 text-brand focus:ring-brand border-gray-200 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-gray-600 font-semibold">
                    Remember me
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="font-bold text-brand hover:text-brand-dark transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-brand/10 text-sm font-bold text-white bg-brand hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading
                  ? 'Processing...'
                  : isRegistering
                  ? 'Complete Admin Setup'
                  : 'Sign In'}
              </button>
            </div>
          </form>

          <div className="mt-6 flex items-center justify-center">
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-sm font-bold text-brand hover:text-brand-dark transition-colors focus:outline-none"
            >
              {isRegistering
                ? 'Back to User Log In'
                : 'Need Initial Admin Setup? Register here'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
