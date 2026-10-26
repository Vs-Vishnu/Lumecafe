import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Bike,
  Package,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Clock,
  MapPin,
  Calendar,
  Sparkles,
  ChevronRight,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';
import Toast from '../components/Toast';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import RouteNavigationModal from '../components/RouteNavigationModal';

const DeliveryDashboard = () => {
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    assignedOrders: 0,
    activeDeliveries: 0,
    completedDeliveries: 0,
    todayCompletedDeliveries: 0,
  });
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals & Navigation state
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [confirmationCodeInput, setConfirmationCodeInput] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');

  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [issueReason, setIssueReason] = useState('Traffic Congestion');
  const [issueDetails, setIssueDetails] = useState('');

  const [selectedAssignmentForAction, setSelectedAssignmentForAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [dashRes, assignRes] = await Promise.all([
        api.get('/delivery-partner/dashboard'),
        api.get('/delivery-partner/assignments'),
      ]);

      if (dashRes.data.success) {
        setProfile(dashRes.data.data.profile);
        setStats(dashRes.data.data.stats);
        setActiveAssignment(dashRes.data.data.activeAssignment);
      }

      if (assignRes.data.success) {
        setAssignments(assignRes.data.data);
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading delivery dashboard.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
  };

  const handleToggleAvailability = async (newStatus) => {
    try {
      const response = await api.patch('/delivery-partner/availability', { availability: newStatus });
      if (response.data.success) {
        setProfile((prev) => ({ ...prev, availability: newStatus }));
        showToast(`Status updated to ${newStatus}.`);
      }
    } catch (err) {
      showToast('Failed to update availability status.', 'error');
    }
  };

  // Lifecycle handlers
  const handleAcceptAssignment = async (assignmentId) => {
    setActionLoading(true);
    try {
      const res = await api.post(`/delivery-partner/assignments/${assignmentId}/accept`);
      if (res.data.success) {
        showToast('Assignment accepted!');
        fetchDashboardData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to accept assignment.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePickup = async (assignmentId) => {
    setActionLoading(true);
    try {
      const res = await api.post(`/delivery-partner/assignments/${assignmentId}/pickup`);
      if (res.data.success) {
        showToast('Order marked as Picked Up! Customer has been notified.');
        fetchDashboardData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Pickup action failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartDelivery = async (assignmentId) => {
    setActionLoading(true);
    try {
      const res = await api.post(`/delivery-partner/assignments/${assignmentId}/start`);
      if (res.data.success) {
        showToast('You are now Out for Delivery! Safe driving.');
        fetchDashboardData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to start delivery.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenCompleteModal = (assignment) => {
    setSelectedAssignmentForAction(assignment);
    setConfirmationCodeInput('');
    setCompletionNotes('');
    setIsCompleteModalOpen(true);
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAssignmentForAction) return;

    setActionLoading(true);
    try {
      const res = await api.post(`/delivery-partner/assignments/${selectedAssignmentForAction._id}/complete`, {
        confirmationCode: confirmationCodeInput,
        notes: completionNotes,
      });

      if (res.data.success) {
        showToast('Order marked as Delivered! Great work.', 'success');
        setIsCompleteModalOpen(false);
        fetchDashboardData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Delivery completion failed. Please verify code.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenIssueModal = (assignment) => {
    setSelectedAssignmentForAction(assignment);
    setIssueReason('Customer Phone Unreachable');
    setIssueDetails('');
    setIsIssueModalOpen(true);
  };

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAssignmentForAction) return;

    setActionLoading(true);
    try {
      const res = await api.post(`/delivery-partner/assignments/${selectedAssignmentForAction._id}/report-issue`, {
        reason: issueReason,
        details: issueDetails,
      });

      if (res.data.success) {
        showToast('Issue reported. Admin and support team have been notified.', 'success');
        setIsIssueModalOpen(false);
        fetchDashboardData();
      }
    } catch (err) {
      showToast('Failed to record issue.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Find effective current assignment (either from activeAssignment or first non-delivered from list)
  const currentActive =
    activeAssignment ||
    assignments.find((a) => ['assigned', 'accepted', 'picked_up', 'out_for_delivery'].includes(a.status));

  const completedList = assignments.filter((a) => a.status === 'delivered');

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans pb-16">
      {toastMsg && <Toast message={toastMsg} type={toastType} onClose={() => setToastMsg(null)} />}

      {/* Top Header & Availability Switcher */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight font-display">
              Delivery Partner Portal
            </h2>
            <span className="px-2.5 py-0.5 bg-brand/10 text-brand text-[10px] font-black rounded-full uppercase">
              {profile?.vehicleType || 'Bike'} Driver
            </span>
          </div>
          <p className="text-xs text-gray-500 font-semibold mt-0.5">
            Welcome back, <strong>{user?.name}</strong> • Vehicle: {profile?.vehicleNumber || 'Registered'}
          </p>
        </div>

        {/* Availability Toggle */}
        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-200">
          <span className="text-[11px] font-bold text-gray-400 pl-2">Duty Status:</span>
          {[
            { id: 'available', label: 'Available', color: 'bg-brand text-white shadow-xs' },
            { id: 'busy', label: 'Busy', color: 'bg-amber-500 text-white shadow-xs' },
            { id: 'offline', label: 'Offline', color: 'bg-gray-600 text-white shadow-xs' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => handleToggleAvailability(btn.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                profile?.availability === btn.id ? btn.color : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Assigned Orders', val: stats.assignedOrders, icon: Package, color: 'text-blue-600 bg-blue-50' },
          { label: 'Active Deliveries', val: stats.activeDeliveries, icon: Bike, color: 'text-amber-600 bg-amber-50' },
          { label: 'Total Completed', val: stats.completedDeliveries, icon: CheckCircle2, color: 'text-brand bg-emerald-50' },
          { label: "Today's Deliveries", val: stats.todayCompletedDeliveries, icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
        ].map((kpi, idx) => {
          const IconComp = kpi.icon;
          return (
            <div key={idx} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">{kpi.label}</span>
                <span className="text-2xl font-black text-gray-900 mt-1 block">{kpi.val}</span>
              </div>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${kpi.color}`}>
                <IconComp className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Delivery Highlight Banner */}
      {currentActive && (
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl space-y-5 border border-gray-800">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-800 pb-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/20 text-brand text-xs font-bold uppercase tracking-wider mb-2">
                <Bike className="w-3.5 h-3.5" />
                Active Delivery in Progress
              </span>
              <h3 className="text-xl font-extrabold font-display">
                Order #{currentActive.order?.orderNumber}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-white/10 rounded-xl text-xs font-bold uppercase text-amber-300">
                Status: {currentActive.status.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Customer & Address Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
              <span className="text-gray-400 font-bold uppercase text-[10px] tracking-wider block">Customer Information</span>
              <p className="text-sm font-black text-white">{currentActive.order?.deliveryAddress?.fullName || currentActive.order?.customerDetails?.name}</p>
              <div className="flex items-center gap-2 pt-1">
                {currentActive.order?.deliveryAddress?.phone && (
                  <a
                    href={`tel:${currentActive.order.deliveryAddress.phone}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-brand" />
                    <span>Call Customer: {currentActive.order.deliveryAddress.phone}</span>
                  </a>
                )}
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-1">
              <span className="text-gray-400 font-bold uppercase text-[10px] tracking-wider block">Doorstep Delivery Address</span>
              <p className="font-semibold text-gray-200">
                {currentActive.order?.deliveryAddress?.houseNumber}, {currentActive.order?.deliveryAddress?.streetName}
              </p>
              <p className="text-gray-400">
                {currentActive.order?.deliveryAddress?.area}, {currentActive.order?.deliveryAddress?.city} - {currentActive.order?.deliveryAddress?.postalCode}
              </p>
              {currentActive.order?.deliveryAddress?.landmark && (
                <p className="text-gray-300 text-[11px] pt-1">
                  Landmark: <strong className="text-white">{currentActive.order.deliveryAddress.landmark}</strong>
                </p>
              )}
            </div>
          </div>

          {/* Controlled Delivery Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {/* Open Map Navigation */}
            <button
              onClick={() => setIsNavOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-bold shadow-lg shadow-brand/20 transition-all cursor-pointer"
            >
              <Navigation className="w-4 h-4" />
              <span>Open Map & Route Navigation</span>
            </button>

            {/* Status Transition buttons based on workflow */}
            {currentActive.status === 'assigned' && (
              <button
                onClick={() => handleAcceptAssignment(currentActive._id)}
                disabled={actionLoading}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Accept Assignment
              </button>
            )}

            {['assigned', 'accepted'].includes(currentActive.status) && (
              <button
                onClick={() => handlePickup(currentActive._id)}
                disabled={actionLoading}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Mark as Picked Up
              </button>
            )}

            {currentActive.status === 'picked_up' && (
              <button
                onClick={() => handleStartDelivery(currentActive._id)}
                disabled={actionLoading}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Start Delivery (Out for Delivery)
              </button>
            )}

            {['picked_up', 'out_for_delivery'].includes(currentActive.status) && (
              <button
                onClick={() => handleOpenCompleteModal(currentActive)}
                disabled={actionLoading}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                Mark as Delivered
              </button>
            )}

            <button
              onClick={() => handleOpenIssueModal(currentActive)}
              className="px-4 py-2.5 bg-white/10 hover:bg-red-500/20 text-red-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Report Issue
            </button>
          </div>
        </div>
      )}

      {/* Assigned Orders Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-gray-900">Assigned Deliveries ({assignments.length})</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider text-left">
              <tr>
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Destination Address</th>
                <th className="px-6 py-4 text-center">Amount</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto"></div>
                  </td>
                </tr>
              ) : assignments.length > 0 ? (
                assignments.map((assignment) => {
                  const ord = assignment.order;
                  const addr = ord?.deliveryAddress;

                  return (
                    <tr key={assignment._id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap">
                        #{ord?.orderNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-gray-900 block">{addr?.fullName || ord?.customerDetails?.name}</span>
                        <span className="text-xs text-gray-400">{addr?.phone}</span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600 max-w-xs truncate">
                        {addr ? `${addr.houseNumber}, ${addr.streetName}, ${addr.area}, ${addr.city}` : 'Manual Address'}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-gray-900 whitespace-nowrap">
                        ₹{ord?.grandTotal?.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                            assignment.status === 'delivered'
                              ? 'bg-emerald-100 text-brand'
                              : assignment.status === 'out_for_delivery'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {assignment.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => {
                            setActiveAssignment(assignment);
                            setIsNavOpen(true);
                          }}
                          className="px-3 py-1.5 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          Navigate
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400 font-semibold">
                    No delivery assignments currently assigned to your account.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Route Navigation Modal with Interactive Map */}
      {currentActive && (
        <RouteNavigationModal
          isOpen={isNavOpen}
          onClose={() => setIsNavOpen(false)}
          destinationAddress={currentActive.order?.deliveryAddress}
          orderNumber={currentActive.order?.orderNumber}
        />
      )}

      {/* Complete Delivery Modal */}
      <Modal
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        title="Complete Delivery Confirmation"
      >
        <form onSubmit={handleCompleteSubmit} className="space-y-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-xs text-emerald-900">
            Confirm that the order has been handed over safely to the customer at the verified doorstep address.
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Customer Confirmation Code (Optional OTP)
            </label>
            <input
              type="text"
              maxLength={6}
              value={confirmationCodeInput}
              onChange={(e) => setConfirmationCodeInput(e.target.value)}
              placeholder="e.g. 4-digit code provided by customer"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 tracking-widest text-center font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Delivery Notes (Optional)</label>
            <input
              type="text"
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="e.g. Handed to customer at gate"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsCompleteModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 text-xs font-bold bg-brand hover:bg-brand-dark text-white rounded-xl shadow-md shadow-brand/10"
            >
              {actionLoading ? 'Saving...' : 'Confirm Delivery Completed'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Report Issue Modal */}
      <Modal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        title="Report Delivery Issue"
      >
        <form onSubmit={handleIssueSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Issue Category *</label>
            <select
              value={issueReason}
              onChange={(e) => setIssueReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              <option value="Customer Phone Unreachable">Customer Phone Unreachable</option>
              <option value="Wrong Delivery Address">Wrong Delivery Address</option>
              <option value="Customer Not At Home">Customer Not At Home</option>
              <option value="Severe Weather or Road Closure">Severe Weather or Road Closure</option>
              <option value="Vehicle Breakdown">Vehicle Breakdown</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Details & Context</label>
            <textarea
              rows={3}
              value={issueDetails}
              onChange={(e) => setIssueDetails(e.target.value)}
              placeholder="Provide specific notes so the manager can contact the customer..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsIssueModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md shadow-red-500/10"
            >
              {actionLoading ? 'Submitting...' : 'Send Issue Alert'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DeliveryDashboard;
