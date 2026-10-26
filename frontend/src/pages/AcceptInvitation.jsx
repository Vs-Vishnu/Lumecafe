import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Bike, Lock, Phone, User, CheckCircle2, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import Toast from '../components/Toast';

const AcceptInvitation = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { authenticateWithToken } = useAuth();

  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Form fields
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [vehicleType, setVehicleType] = useState('Bike');
  const [vehicleNumber, setVehicleNumber] = useState('');

  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/delivery-invitations/${token}/validate`);
      if (response.data.success) {
        setInvitation(response.data.data);
        if (response.data.data.phone) {
          setPhone(response.data.data.phone);
        }
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Invalid, expired, or revoked invitation token.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password || password.length < 6) {
      setToastMsg('Password must be at least 6 characters long.');
      setToastType('error');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post(`/delivery-invitations/${token}/accept`, {
        password,
        phone,
        vehicleType,
        vehicleNumber,
      });

      if (response.data.success) {
        setToastMsg('Account activated successfully! Redirecting to your Delivery Dashboard...');
        setToastType('success');
        authenticateWithToken(response.data.token, response.data.user);
        setTimeout(() => {
          navigate('/delivery/dashboard');
        }, 1500);
      }
    } catch (err) {
      setToastMsg(err.response?.data?.message || 'Failed to activate invitation.');
      setToastType('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      {toastMsg && <Toast message={toastMsg} type={toastType} onClose={() => setToastMsg(null)} />}

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto flex items-center justify-center w-16 h-16 bg-brand text-white rounded-2xl shadow-xl shadow-brand/30">
          <Bike className="w-8 h-8" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 font-display tracking-tight">
          Delivery Partner Activation
        </h2>
        <p className="mt-2 text-center text-sm font-semibold text-gray-500">
          Accept your official administrator invitation and activate your account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-gray-200/50 rounded-3xl sm:px-10 border border-gray-100">
          {loading ? (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand mx-auto mb-3"></div>
              <p className="text-sm font-bold text-gray-500">Verifying secure invitation token...</p>
            </div>
          ) : errorMsg ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Invitation Link Invalid</h3>
              <p className="text-sm text-gray-600 font-medium px-4">{errorMsg}</p>
              <div className="pt-4 border-t border-gray-100">
                <button
                  onClick={() => navigate('/login')}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Invitee Info Banner */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                  <ShieldCheck className="w-4 h-4 text-brand" />
                  <span>Verified Invitation</span>
                </div>
                <p className="text-sm font-black text-gray-900">{invitation?.name}</p>
                <p className="text-xs text-gray-600 font-semibold">{invitation?.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-brand text-[10px] font-extrabold rounded-full uppercase">
                  Role: Delivery Partner
                </span>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-gray-700">Create Password *</label>
                <div className="mt-1 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock className="h-4.5 w-4.5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Set your account password"
                    className="block w-full pl-10 pr-11 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-gray-700">Phone Number *</label>
                <div className="mt-1 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Phone className="h-4.5 w-4.5" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  />
                </div>
              </div>

              {/* Vehicle Type & Number */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700">Vehicle Type</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
                  >
                    <option value="Bike">Motorcycle</option>
                    <option value="Scooter">Scooter</option>
                    <option value="Bicycle">Bicycle</option>
                    <option value="Car">Car</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700">Vehicle No.</label>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="KA-01-AB-1234"
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 uppercase"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-lg shadow-brand/10 text-sm font-bold text-white bg-brand hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand disabled:opacity-50 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitting ? 'Activating Account...' : 'Accept Invitation & Activate'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitation;
