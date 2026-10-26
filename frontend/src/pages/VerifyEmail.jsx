import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import { CheckCircle2, AlertCircle, Mail, ArrowRight } from 'lucide-react';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (token) {
      verify();
    } else {
      setLoading(false);
      setMessage('No verification token provided in link.');
    }
  }, [token]);

  const verify = async () => {
    try {
      const response = await api.get(`/auth/verify-email/${token}`);
      if (response.data.success) {
        setSuccess(true);
        setMessage(response.data.message || 'Email verified successfully!');
      }
    } catch (err) {
      setSuccess(false);
      setMessage(err.response?.data?.message || 'Verification link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto flex items-center justify-center w-16 h-16 bg-brand text-white rounded-2xl shadow-xl shadow-brand/30">
          <Mail className="w-8 h-8" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 font-display tracking-tight">
          Email Verification
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-gray-200/50 rounded-3xl sm:px-10 border border-gray-100 text-center">
          {loading ? (
            <div className="py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand mx-auto mb-3"></div>
              <p className="text-sm font-bold text-gray-500">Verifying your email address...</p>
            </div>
          ) : success ? (
            <div className="space-y-4 py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-brand flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Email Verified!</h3>
              <p className="text-sm text-gray-600 font-medium">{message}</p>
              <div className="pt-4">
                <Link
                  to="/menu"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand hover:bg-brand-dark text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-brand/20"
                >
                  <span>Browse Menu & Order</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Verification Failed</h3>
              <p className="text-sm text-gray-600 font-medium">{message}</p>
              <div className="pt-4">
                <Link
                  to="/login"
                  className="inline-block px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs transition-colors"
                >
                  Go to Sign In
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
