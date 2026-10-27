import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bike, Mail, ArrowLeft, ArrowRight, ShieldCheck, CheckCircle2, KeyRound } from 'lucide-react';
import api from '../services/api';
import Toast from '../components/Toast';

const DeliveryPartnerForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');
  const navigate = useNavigate();

  // Basic email format validation
  const isValidEmail = (val) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !isValidEmail(email)) {
      setToastMsg('Please enter a valid email address.');
      setToastType('error');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/delivery-partner/auth/forgot-password', {
        email: email.trim(),
      });

      if (response.data.success) {
        setSubmitted(true);
        setToastMsg(response.data.message || 'Password reset instructions have been dispatched.');
        setToastType('success');
      }
    } catch (err) {
      // Handle network or unexpected server errors safely without leaking details
      const msg = err.response?.data?.message || 'Unable to process request at this moment. Please try again.';
      setToastMsg(msg);
      setToastType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-gray-100 to-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      {toastMsg && <Toast message={toastMsg} type={toastType} onClose={() => setToastMsg(null)} />}

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Delivery Partner Branding Badge */}
        <div className="mx-auto flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-emerald-600 to-teal-500 text-white rounded-2xl shadow-xl shadow-emerald-500/30">
          <Bike className="w-8 h-8" />
        </div>

        <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100/80 border border-emerald-200 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Delivery Partner Portal</span>
        </div>

        <h2 className="mt-3 text-center text-3xl font-extrabold text-gray-900 font-display tracking-tight">
          Forgot Password?
        </h2>
        <p className="mt-2 text-center text-sm font-semibold text-gray-500 px-4">
          Enter your registered Delivery Partner email address to receive password recovery instructions.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-gray-200/50 rounded-3xl sm:px-10 border border-gray-100 space-y-6">
          {!submitted ? (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Registered Email Address *
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
                    placeholder="driver@lumecafe.com"
                    className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <p className="mt-2 text-[11px] text-gray-500 leading-normal">
                  We will send a cryptographically verified one-click reset link and a single-use 6-digit OTP code to this address.
                </p>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-emerald-600/20 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {loading ? (
                    <span>Dispatching Instructions...</span>
                  ) : (
                    <>
                      <span>Send Recovery Instructions</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center space-y-5 py-2">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-gray-900">Recovery Instructions Sent</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  If an active Delivery Partner account is associated with <strong>{email}</strong>, a single-use password reset link and a 6-digit verification code have been dispatched.
                </p>
              </div>

              <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200/80 text-left text-xs text-amber-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <span>⏱️ Code expires in 15 minutes</span>
                </p>
                <p className="text-[11px] text-amber-700">
                  Check your inbox and spam folder. You can click the link in your email or enter the 6-digit code on the reset page.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <button
                  onClick={() => navigate('/delivery-partner/reset-password')}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>I Have a Reset Code / Link</span>
                </button>

                <button
                  onClick={() => setSubmitted(false)}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Did not receive? Try another email
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-center border-t border-gray-100 pt-5">
            <Link
              to="/login?role=delivery_partner"
              className="flex items-center gap-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Delivery Partner Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryPartnerForgotPassword;
