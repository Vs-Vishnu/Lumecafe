import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, User, Phone, Eye, EyeOff, ArrowRight, Bike, ShieldCheck, CheckCircle2, KeyRound } from 'lucide-react';
import Toast from '../components/Toast';
import Modal from '../components/Modal';
import api from '../services/api';

const Login = ({ initialRole = null }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, googleLogin } = useAuth();

  const [isRegistering, setIsRegistering] = useState(false);
  const [isDeliveryPartner, setIsDeliveryPartner] = useState(initialRole === 'delivery_partner');

  // Form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  // Toast notifications
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');

  // Branding
  const [logo, setLogo] = useState('');
  const [businessName, setBusinessName] = useState('LumeCafe');

  // Delivery Partner Forgot Password Modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('mode') === 'register') {
      setIsRegistering(true);
    }
    if (
      initialRole === 'delivery_partner' ||
      searchParams.get('role') === 'delivery_partner' ||
      location.pathname.includes('delivery-partner')
    ) {
      setIsDeliveryPartner(true);
      setIsRegistering(false);
    }

    const fetchSettings = async () => {
      try {
        const response = await api.get('/settings');
        if (response.data.success && response.data.data) {
          setLogo(response.data.data.logo || '');
          setBusinessName(response.data.data.businessName || 'LumeCafe');
        }
      } catch (err) {
        console.error('Error fetching settings for Login:', err);
      }
    };
    fetchSettings();
  }, [location.search, location.pathname, initialRole]);

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

    if (isRegistering && !isDeliveryPartner) {
      if (!name || !email || !password) {
        setToastMsg('Please fill in your name, email, and password.');
        setToastType('error');
        setLoading(false);
        return;
      }

      const res = await register(name, email, password, phone, 'customer');
      if (res.success) {
        setToastMsg(res.message || 'Account created successfully! Welcome to LumeCafe.');
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

  // Handle Forgot Password modal submission
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail.trim())) {
      setToastMsg('Please enter a valid email address.');
      setToastType('error');
      return;
    }

    setForgotLoading(true);
    try {
      const endpoint = isDeliveryPartner
        ? '/delivery-partner/auth/forgot-password'
        : '/auth/forgot-password';

      const response = await api.post(endpoint, {
        email: forgotEmail.trim(),
      });

      if (response.data.success) {
        setForgotSubmitted(true);
        setForgotMessage(
          response.data.message ||
            'If an eligible account is registered with this email, password reset instructions have been sent.'
        );
      }
    } catch (err) {
      setToastMsg(err.response?.data?.message || 'Error sending password reset instructions.');
      setToastType('error');
    } finally {
      setForgotLoading(false);
    }
  };

  const openForgotDialog = () => {
    setForgotEmail(email || '');
    setForgotSubmitted(false);
    setForgotMessage('');
    setIsForgotModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      {toastMsg && <Toast message={toastMsg} type={toastType} onClose={handleToastClose} />}

      {/* Forgot Password Modal Dialog */}
      <Modal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        title={isDeliveryPartner ? 'Delivery Partner Password Recovery' : 'Account Password Recovery'}
        size="sm"
      >
        <div className="space-y-4 py-1">
          {!forgotSubmitted ? (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-emerald-50/80 border border-emerald-100 rounded-xl text-xs text-emerald-800">
                <Bike className="w-5 h-5 flex-shrink-0 text-emerald-600" />
                <p>
                  Enter your registered Delivery Partner email address. We will dispatch a single-use reset link and a 6-digit verification code.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Registered Email Address *
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Mail className="h-4.5 w-4.5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="partner@lumecafe.com"
                    className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {forgotLoading ? <span>Sending...</span> : <span>Send Reset Instructions</span>}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center space-y-4 py-2">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-gray-900">Instructions Dispatched</h4>
              <p className="text-xs text-gray-600 leading-relaxed px-2">
                {forgotMessage}
              </p>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 text-left">
                ⏱️ The reset link and 6-digit OTP code expire in <strong>15 minutes</strong>.
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotModalOpen(false);
                    navigate('/delivery-partner/reset-password');
                  }}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Enter 6-Digit OTP / Reset Password</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Header Branding */}
        {isDeliveryPartner ? (
          <div className="mx-auto flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-emerald-600 to-teal-500 text-white rounded-2xl font-display font-black text-3xl shadow-xl shadow-emerald-500/30">
            <Bike className="w-8 h-8" />
          </div>
        ) : logo ? (
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

        {isDeliveryPartner ? (
          <>
            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100/80 border border-emerald-200 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Delivery Partner Portal</span>
            </div>
            <h2 className="mt-3 text-center text-3xl font-extrabold text-gray-900 font-display tracking-tight">
              Delivery Partner Sign In
            </h2>
            <p className="mt-2 text-center text-sm font-semibold text-gray-500">
              Access your driver portal, active deliveries & shortest route navigation
            </p>
          </>
        ) : (
          <>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 font-display tracking-tight">
              {isRegistering ? 'Create Customer Account' : `Sign In to ${businessName}`}
            </h2>
            <p className="mt-2 text-center text-sm font-semibold text-gray-500">
              {isRegistering
                ? 'Join to order fresh meals, save delivery addresses, and track orders'
                : 'Access your customer orders, delivery portal, or business manager'}
            </p>
          </>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-gray-200/50 rounded-3xl sm:px-10 border border-gray-100">
          {/* Role Switching Quick Tabs */}
          <div className="flex rounded-xl bg-gray-100 p-1 mb-6 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setIsDeliveryPartner(false);
                setIsRegistering(false);
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                !isDeliveryPartner
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Customer / Staff
            </button>
            <button
              type="button"
              onClick={() => {
                setIsDeliveryPartner(true);
                setIsRegistering(false);
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                isDeliveryPartner
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Delivery Partner</span>
            </button>
          </div>

          {/* Google OAuth (Customer / Staff only) */}
          {!isDeliveryPartner && (
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
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {isRegistering && !isDeliveryPartner && (
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
              <label className="block text-xs font-bold text-gray-700">
                {isDeliveryPartner ? 'Delivery Partner Email *' : 'Email Address *'}
              </label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="h-4.5 w-4.5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isDeliveryPartner ? 'partner@lumecafe.com' : 'name@example.com'}
                  className={`block w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                    isDeliveryPartner
                      ? 'focus:ring-emerald-500/20 focus:border-emerald-500'
                      : 'focus:ring-brand/20 focus:border-brand'
                  }`}
                />
              </div>
            </div>

            {isRegistering && !isDeliveryPartner && (
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
                  className={`block w-full pl-10 pr-11 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                    isDeliveryPartner
                      ? 'focus:ring-emerald-500/20 focus:border-emerald-500'
                      : 'focus:ring-brand/20 focus:border-brand'
                  }`}
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

            {/* Forgot Password Link - Specifically styled and opening modal or page */}
            {!isRegistering && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 font-semibold">Forgot your password?</span>
                <button
                  type="button"
                  onClick={openForgotDialog}
                  className={`font-bold transition-colors cursor-pointer ${
                    isDeliveryPartner
                      ? 'text-emerald-600 hover:text-emerald-700'
                      : 'text-brand hover:text-brand-dark'
                  }`}
                >
                  {isDeliveryPartner ? 'Forgot Partner Password?' : 'Recover Password'}
                </button>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-lg text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-all cursor-pointer ${
                  isDeliveryPartner
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 focus:ring-emerald-500'
                    : 'bg-brand hover:bg-brand-dark shadow-brand/10 focus:ring-brand'
                }`}
              >
                <span>
                  {loading
                    ? 'Processing...'
                    : isRegistering
                    ? 'Register Customer Account'
                    : isDeliveryPartner
                    ? 'Sign In to Driver Console'
                    : 'Sign In'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Footer toggle options */}
          <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col items-center justify-center text-center gap-2">
            {!isDeliveryPartner ? (
              <button
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-xs font-bold text-brand hover:text-brand-dark transition-colors focus:outline-none cursor-pointer"
              >
                {isRegistering
                  ? 'Already have an account? Sign in here'
                  : "Don't have an account? Register as Customer"}
              </button>
            ) : (
              <div className="text-xs text-gray-500">
                New delivery partner? Contact your Administrator for an invitation link.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
