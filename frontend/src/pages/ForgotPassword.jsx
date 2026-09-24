import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, KeyRound } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto flex items-center justify-center w-16 h-16 bg-accent-light text-accent rounded-2xl font-display font-black text-3xl shadow-xl shadow-accent/25">
          <KeyRound className="w-8 h-8" />
        </div>

        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 font-display tracking-tight">
          Forgot Password?
        </h2>
        <p className="mt-2 text-center text-sm font-semibold text-gray-500">
          Resetting cashier credentials or admin passwords.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-gray-200/50 rounded-3xl sm:px-10 border border-gray-100 space-y-6">
          {!submitted ? (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-bold text-gray-700">
                  Email Address
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
                    placeholder="cashier@lumebills.com"
                    className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-brand/10 text-sm font-bold text-white bg-brand hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand transition-all cursor-pointer"
                >
                  Send Reset Code
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <div className="p-4 bg-green-50 rounded-2xl text-sm text-green-800 font-semibold border border-green-200">
                Instructions have been sent to your admin email: <strong>{email}</strong>.
              </div>
              <p className="text-xs text-gray-500">
                Contact your LumeBills Administrator directly to force reset password via the Cashiers Settings Panel.
              </p>
            </div>
          )}

          <div className="flex justify-center border-t border-gray-100 pt-4">
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 text-sm font-bold text-brand hover:text-brand-dark transition-colors focus:outline-none"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
