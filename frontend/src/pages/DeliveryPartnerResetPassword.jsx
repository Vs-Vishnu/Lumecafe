import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Bike, KeyRound, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../services/api';
import Toast from '../components/Toast';

const DeliveryPartnerResetPassword = () => {
  const [searchParams] = useSearchParams();
  const queryToken = searchParams.get('token') || '';
  const queryOtp = searchParams.get('otp') || '';
  const navigate = useNavigate();

  // Mode: 'token' if arrived via link with query token, otherwise 'otp' (or allow switching)
  const [useOtpMode, setUseOtpMode] = useState(!queryToken);
  const [tokenInput, setTokenInput] = useState(queryToken);
  const [otpInput, setOtpInput] = useState(queryOtp);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(Boolean(queryToken));
  const [tokenStatus, setTokenStatus] = useState(null); // { valid: boolean, message: string }
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [success, setSuccess] = useState(false);

  // Auto-verify token if present in URL
  useEffect(() => {
    if (queryToken) {
      verifyCredential('token', queryToken);
    }
  }, [queryToken]);

  const verifyCredential = async (type, value) => {
    if (!value || !value.trim()) return;
    setVerifying(true);
    try {
      const endpoint = type === 'token'
        ? `/delivery-partner/auth/verify-token?token=${encodeURIComponent(value.trim())}`
        : `/delivery-partner/auth/verify-token?otp=${encodeURIComponent(value.trim())}`;

      const res = await api.get(endpoint);
      if (res.data.success && res.data.valid) {
        setTokenStatus({ valid: true, message: 'Reset credentials verified.' });
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Invalid or expired password reset link/code.';
      setTokenStatus({ valid: false, message });
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check credential presence
    const activeToken = useOtpMode ? undefined : tokenInput.trim();
    const activeOtp = useOtpMode ? otpInput.trim() : undefined;

    if (!activeToken && !activeOtp) {
      setToastMsg('Please provide your 6-digit OTP code or reset token.');
      setToastType('error');
      return;
    }

    if (useOtpMode && activeOtp && !/^\d{6}$/.test(activeOtp)) {
      setToastMsg('OTP verification code must be exactly 6 digits.');
      setToastType('error');
      return;
    }

    if (!password || password.length < 6) {
      setToastMsg('Password must be at least 6 characters long.');
      setToastType('error');
      return;
    }

    if (password !== confirmPassword) {
      setToastMsg('Passwords do not match. Please re-check.');
      setToastType('error');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        password,
        confirmPassword,
      };

      if (useOtpMode) {
        payload.otp = activeOtp;
      } else {
        payload.token = activeToken;
      }

      const response = await api.post('/delivery-partner/auth/reset-password', payload);

      if (response.data.success) {
        setSuccess(true);
        setToastMsg(response.data.message || 'Password updated successfully! Redirecting...');
        setToastType('success');
        setTimeout(() => {
          navigate('/login?role=delivery_partner');
        }, 1800);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Password reset failed. The link or OTP may have expired.';
      setToastMsg(msg);
      setToastType('error');
      // If code was invalid or expired, flag tokenStatus
      setTokenStatus({ valid: false, message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-gray-100 to-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      {toastMsg && <Toast message={toastMsg} type={toastType} onClose={() => setToastMsg(null)} />}

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-emerald-600 to-teal-500 text-white rounded-2xl shadow-xl shadow-emerald-500/30">
          <KeyRound className="w-8 h-8" />
        </div>

        <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100/80 border border-emerald-200 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Delivery Partner Portal</span>
        </div>

        <h2 className="mt-3 text-center text-3xl font-extrabold text-gray-900 font-display tracking-tight">
          Reset Partner Password
        </h2>
        <p className="mt-2 text-center text-sm font-semibold text-gray-500 px-4">
          Enter your verification code and set a new, secure password for your delivery console.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-gray-200/50 rounded-3xl sm:px-10 border border-gray-100">
          {success ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-extrabold text-gray-900">Password Updated!</h3>
              <p className="text-sm text-gray-600 font-medium">
                Your Delivery Partner account password has been reset securely. Redirecting you to login...
              </p>
              <div className="pt-2">
                <Link
                  to="/login?role=delivery_partner"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
                >
                  <span>Go to Delivery Partner Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Token validation alert banner if verified or failed */}
              {verifying ? (
                <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>Verifying secure reset credentials...</span>
                </div>
              ) : tokenStatus && !tokenStatus.valid ? (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                  <div className="space-y-1">
                    <p className="font-bold">{tokenStatus.message}</p>
                    <Link
                      to="/delivery-partner/forgot-password"
                      className="underline font-semibold hover:text-red-900 inline-block"
                    >
                      Click here to request a new reset code
                    </Link>
                  </div>
                </div>
              ) : null}

              {/* Mode Toggle (OTP vs Reset Link Token) */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <span className="text-xs font-bold text-gray-700">Verification Method:</span>
                <button
                  type="button"
                  onClick={() => setUseOtpMode(!useOtpMode)}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  {useOtpMode ? 'Switch to Link Token' : 'Switch to 6-Digit OTP'}
                </button>
              </div>

              {/* OTP or Token Input */}
              {useOtpMode ? (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    6-Digit Verification Code (OTP) *
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <KeyRound className="h-4.5 w-4.5" />
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      required
                      value={otpInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setOtpInput(val);
                        if (val.length === 6) {
                          verifyCredential('otp', val);
                        }
                      }}
                      placeholder="e.g. 583921"
                      className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-base font-mono tracking-widest placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-center font-bold"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-gray-400">
                    Found in your password reset email from LumeCafe.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Reset Token *
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <KeyRound className="h-4.5 w-4.5" />
                    </div>
                    <input
                      type="text"
                      required
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder="Paste your 64-character token"
                      className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-xs font-mono placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  New Password *
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock className="h-4.5 w-4.5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="block w-full pl-10 pr-11 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
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

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Confirm New Password *
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock className="h-4.5 w-4.5" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className={`block w-full pl-10 pr-11 py-2.5 border rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                      confirmPassword && password !== confirmPassword
                        ? 'border-red-300 focus:ring-red-200 focus:border-red-500'
                        : 'border-gray-200 focus:ring-emerald-500/20 focus:border-emerald-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="mt-1 text-[11px] text-red-500 font-semibold">
                    Passwords do not match.
                  </p>
                )}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-emerald-600/20 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {loading ? (
                    <span>Saving Secure Password...</span>
                  ) : (
                    <>
                      <span>Save & Reset Password</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between text-xs">
            <Link
              to="/delivery-partner/forgot-password"
              className="font-bold text-gray-500 hover:text-gray-700 transition-colors"
            >
              Need a new code?
            </Link>
            <Link
              to="/login?role=delivery_partner"
              className="font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryPartnerResetPassword;
