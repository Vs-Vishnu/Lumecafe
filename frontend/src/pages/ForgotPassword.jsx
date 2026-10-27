import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Mail, ArrowLeft, ArrowRight, KeyRound, Bike, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import Toast from '../components/Toast';

const ForgotPassword = () => {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role');
  const navigate = useNavigate();

  const [role, setRole] = useState(initialRole === 'delivery_partner' ? 'delivery_partner' : 'customer');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');

  useEffect(() => {
    if (initialRole === 'delivery_partner') {
      setRole('delivery_partner');
    }
  }, [initialRole]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setToastMsg('Please enter a valid email address.');
      setToastType('error');
      return;
    }

    setLoading(true);
    try {
      const endpoint = role === 'delivery_partner'
        ? '/delivery-partner/auth/forgot-password'
        : '/auth/forgot-password';

      const response = await api.post(endpoint, { email: email.trim() });

      if (response.data.success) {
        setSubmitted(true);
        setMessage(
          response.data.message ||
            'If an eligible account is registered with this email, password recovery instructions have been sent.'
        );
        setToastMsg('Recovery instructions dispatched!');
        setToastType('success');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Error requesting password reset. Please try again.';
      setToastMsg(errorMsg);
      setToastType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      {toastMsg && <Toast message={toastMsg} type={toastType} onClose={() => setToastMsg(null)} />}

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className={`mx-auto flex items-center justify-center w-16 h-16 rounded-2xl shadow-xl ${
          role === 'delivery_partner'
            ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-500/30'
            : 'bg-brand text-white shadow-brand/30'
        }`}>
          {role === 'delivery_partner' ? <Bike className="w-8 h-8" /> : <KeyRound className="w-8 h-8" />}
        </div>

        <h2 className="mt-5 text-center text-3xl font-extrabold text-gray-900 font-display tracking-tight">
          Forgot Password?
        </h2>
        <p className="mt-2 text-center text-sm font-semibold text-gray-500">
          {role === 'delivery_partner'
            ? 'Reset your LumeCafe Delivery Partner credentials'
            : 'Recover access to your customer or staff account'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-gray-200/50 rounded-3xl sm:px-10 border border-gray-100 space-y-6">
          {/* Role selector tab */}
          <div className="flex rounded-xl bg-gray-100 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setRole('customer');
                setSubmitted(false);
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                role !== 'delivery_partner'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Customer / Staff
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('delivery_partner');
                setSubmitted(false);
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                role === 'delivery_partner'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Delivery Partner</span>
            </button>
          </div>

          {!submitted ? (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  {role === 'delivery_partner' ? 'Delivery Partner Email *' : 'Registered Email Address *'}
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={role === 'delivery_partner' ? 'driver@lumecafe.com' : 'user@example.com'}
                    className={`block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                      role === 'delivery_partner'
                        ? 'focus:ring-emerald-500/20 focus:border-emerald-500'
                        : 'focus:ring-brand/20 focus:border-brand'
                    }`}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-lg text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-all cursor-pointer ${
                    role === 'delivery_partner'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 focus:ring-emerald-500'
                      : 'bg-brand hover:bg-brand-dark shadow-brand/10 focus:ring-brand'
                  }`}
                >
                  <span>{loading ? 'Sending Instructions...' : 'Send Recovery Instructions'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center space-y-4 py-2">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-gray-900">Recovery Instructions Sent</h3>
                <p className="text-xs text-gray-600 leading-relaxed px-2">{message}</p>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 text-left">
                ⏱️ For your security, the reset link and OTP expire in <strong>15 minutes</strong>.
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => {
                    if (role === 'delivery_partner') {
                      navigate('/delivery-partner/reset-password');
                    } else {
                      navigate('/reset-password');
                    }
                  }}
                  className={`w-full py-2.5 px-4 text-white font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                    role === 'delivery_partner' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-brand hover:bg-brand-dark'
                  }`}
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Enter Reset Code / New Password</span>
                </button>
                <button
                  onClick={() => setSubmitted(false)}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                >
                  Try another email
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-center border-t border-gray-100 pt-4">
            <Link
              to={role === 'delivery_partner' ? '/login?role=delivery_partner' : '/login'}
              className="flex items-center gap-2 text-xs font-bold text-brand hover:text-brand-dark transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Login</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
