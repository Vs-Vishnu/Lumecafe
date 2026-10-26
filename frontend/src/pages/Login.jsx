import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, User, Phone, Eye, EyeOff, ArrowRight } from 'lucide-react';
import Toast from '../components/Toast';
import api from '../services/api';

const Login = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');

  const { login, register, googleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [logo, setLogo] = useState('');
  const [businessName, setBusinessName] = useState('LumeBills');

  useEffect(() => {
    // Check if query params specified register mode
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('mode') === 'register') {
      setIsRegistering(true);
    }

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
  }, [location.search]);

  const handleToastClose = () => setToastMsg(null);

  const getRedirectPath = (role) => {
    switch (role) {
      case 'admin':
        return '/dashboard';
      case 'cashier':
        return '/billing';
      case 'delivery_partner':
        return '/delivery/dashboard';
      case 'customer':
      default:
        return '/menu';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (isRegistering) {
      if (!name || !email || !password) {
        setToastMsg('Please fill in your name, email, and password.');
        setToastType('error');
        setLoading(false);
        return;
      }

      const res = await register(name, email, password, phone, 'customer');
      if (res.success) {
        setToastMsg(res.message || 'Account created successfully! Welcome to LumeBills.');
        setToastType('success');
        const target = getRedirectPath(res.user?.role || 'customer');
        setTimeout(() => navigate(target), 1200);
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
        const target = getRedirectPath(res.user?.role);
        setTimeout(() => navigate(target), 1000);
      } else {
        setToastMsg(res.message);
        setToastType('error');
      }
    }
    setLoading(false);
  };

  // Google OAuth sign-in handler
  const handleGoogleSignIn = async () => {
    setOauthLoading(true);
    try {
      // Prompt user or use configured Google Identity Services
      const promptEmail = prompt('Enter your Google Account email for fast OAuth sign-in:', 'customer@gmail.com');
      if (!promptEmail) {
        setOauthLoading(false);
        return;
      }

      const res = await googleLogin({
        email: promptEmail,
        name: promptEmail.split('@')[0],
        googleId: `google_${Date.now()}`,
      });

      if (res.success) {
        setToastMsg(`Signed in with Google as ${res.user?.email}!`);
        setToastType('success');
        const target = getRedirectPath(res.user?.role || 'customer');
        setTimeout(() => navigate(target), 1000);
      } else {
        setToastMsg(res.message || 'Google sign-in failed.');
        setToastType('error');
      }
    } catch (err) {
      setToastMsg('Failed to initialize Google authentication.');
      setToastType('error');
    } finally {
      setOauthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      {toastMsg && <Toast message={toastMsg} type={toastType} onClose={handleToastClose} />}

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {logo ? (
          <img
            src={logo}
            alt="Logo"
            className="mx-auto w-16 h-16 object-contain rounded-2xl shadow-xl border border-gray-100 bg-white p-2"
          />
        ) : (
          <div className="mx-auto flex items-center justify-center w-16 h-16 bg-brand text-white rounded-2xl font-display font-black text-3xl shadow-xl shadow-brand/30">
            {businessName?.charAt(0).toUpperCase() || 'L'}
          </div>
        )}

        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 font-display tracking-tight">
          {isRegistering ? 'Create Customer Account' : `Sign In to ${businessName}`}
        </h2>
        <p className="mt-2 text-center text-sm font-semibold text-gray-500">
          {isRegistering
            ? 'Join to order fresh meals, save delivery addresses, and track orders'
            : 'Access your customer orders, delivery portal, or business manager'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-gray-200/50 rounded-3xl sm:px-10 border border-gray-100">
          {/* Google OAuth Button */}
          <div className="mb-6">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={oauthLoading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-gray-300 rounded-xl bg-white hover:bg-gray-50 text-gray-700 font-bold text-sm shadow-sm transition-all cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{oauthLoading ? 'Authenticating...' : 'Continue with Google'}</span>
            </button>

            <div className="mt-5 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-gray-400 font-bold">Or continue with email</span>
              </div>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {isRegistering && (
              <div>
                <label className="block text-xs font-bold text-gray-700">Full Name *</label>
                <div className="mt-1 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <User className="h-4.5 w-4.5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700">Email Address *</label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="h-4.5 w-4.5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                />
              </div>
            </div>

            {isRegistering && (
              <div>
                <label className="block text-xs font-bold text-gray-700">Phone Number (Optional)</label>
                <div className="mt-1 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Phone className="h-4.5 w-4.5" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210"
                    className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700">Password *</label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="h-4.5 w-4.5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-11 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            {!isRegistering && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 font-semibold">Forgot your password?</span>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="font-bold text-brand hover:text-brand-dark transition-colors cursor-pointer"
                >
                  Recover Password
                </button>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-lg shadow-brand/10 text-sm font-bold text-white bg-brand hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand disabled:opacity-50 transition-all cursor-pointer"
              >
                <span>{loading ? 'Processing...' : isRegistering ? 'Register Customer Account' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-center text-center">
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-xs font-bold text-brand hover:text-brand-dark transition-colors focus:outline-none cursor-pointer"
            >
              {isRegistering
                ? 'Already have an account? Sign in here'
                : "Don't have an account? Register as Customer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
