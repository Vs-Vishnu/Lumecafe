import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  CheckCircle2,
  Clock,
  Bike,
  Package,
  Phone,
  MapPin,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  ShieldCheck,
  ChefHat
} from 'lucide-react';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

const PROGRESS_STEPS = [
  { key: 'order_placed', label: 'Order Placed', icon: Package },
  { key: 'confirmed', label: 'Order Confirmed', icon: CheckCircle2 },
  { key: 'preparing', label: 'Preparing Food', icon: ChefHat },
  { key: 'ready_for_dispatch', label: 'Ready for Dispatch', icon: Clock },
  { key: 'assigned', label: 'Partner Assigned', icon: Bike },
  { key: 'picked_up', label: 'Picked Up', icon: Package },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: Bike },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2 },
];

const TrackOrder = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');

  useEffect(() => {
    fetchOrderDetails();

    // Auto-poll every 5 seconds for real-time tracking
    const pollInterval = setInterval(() => {
      fetchOrderDetails(true);
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [id]);

  const fetchOrderDetails = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const response = await api.get(`/customer/orders/${id}`);
      if (response.data.success) {
        setOrder(response.data.data.order);
        setEvents(response.data.data.events || []);
      }
    } catch (err) {
      if (!isBackground) {
        setToastMsg(err.response?.data?.message || 'Failed to load order details.');
        setToastType('error');
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  const getStepStatus = (stepKey) => {
    if (!order) return 'upcoming';
    if (order.deliveryStatus === 'cancelled') return 'cancelled';

    const orderStatusOrder = [
      'order_placed',
      'confirmed',
      'preparing',
      'ready_for_dispatch',
      'assigned',
      'picked_up',
      'out_for_delivery',
      'delivered',
    ];

    const currentIdx = orderStatusOrder.indexOf(order.deliveryStatus);
    const stepIdx = orderStatusOrder.indexOf(stepKey);

    if (currentIdx > stepIdx) return 'completed';
    if (currentIdx === stepIdx) return 'current';
    return 'upcoming';
  };

  const handleCancelOrder = async () => {
    setCancelling(true);
    try {
      const res = await api.post(`/customer/orders/${id}/cancel`, {
        reason: 'Customer initiated cancellation via tracking page',
      });
      if (res.data.success) {
        setToastMsg('Order cancelled successfully.');
        setToastType('success');
        fetchOrderDetails();
      }
    } catch (err) {
      setToastMsg(err.response?.data?.message || 'Failed to cancel order.');
      setToastType('error');
    } finally {
      setCancelling(false);
      setIsCancelConfirmOpen(false);
    }
  };

  const canCancel = order && ['order_placed', 'confirmed'].includes(order.deliveryStatus);

  if (loading) {
    return (
      <div className="py-24 text-center font-sans">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand mx-auto mb-3"></div>
        <p className="text-sm font-bold text-gray-500">Loading live tracking information...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-16 text-center font-sans max-w-md mx-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Order Not Found</h3>
        <p className="text-xs text-gray-500 mb-4">The requested order could not be located or you are not authorized to view it.</p>
        <button
          onClick={() => navigate('/my-orders')}
          className="px-4 py-2 bg-brand text-white font-bold rounded-xl text-xs"
        >
          Back to My Orders
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans pb-16">
      {toastMsg && <Toast message={toastMsg} type={toastType} onClose={() => setToastMsg(null)} />}

      {/* Back button & Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/my-orders')}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-brand transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Orders</span>
        </button>

        <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Live Polling Updates
        </span>
      </div>

      {/* Status Hero Card */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight font-display">
                Order #{order.orderNumber}
              </h2>
              {order.deliveryStatus === 'delivered' ? (
                <span className="px-3 py-0.5 bg-emerald-100 text-brand text-xs font-black uppercase rounded-full">
                  Delivered
                </span>
              ) : order.deliveryStatus === 'cancelled' ? (
                <span className="px-3 py-0.5 bg-red-100 text-red-600 text-xs font-black uppercase rounded-full">
                  Cancelled
                </span>
              ) : (
                <span className="px-3 py-0.5 bg-brand/10 text-brand text-xs font-black uppercase rounded-full">
                  In Transit
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 font-semibold mt-1">
              Placed on {new Date(order.date || order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} at{' '}
              {new Date(order.date || order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {canCancel && (
            <button
              onClick={() => setIsCancelConfirmOpen(true)}
              className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Cancel Order
            </button>
          )}
        </div>

        {/* 8-Stage Progress Stepper */}
        {order.deliveryStatus !== 'cancelled' ? (
          <div className="py-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">Live Delivery Progress</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {PROGRESS_STEPS.map((step, idx) => {
                const stepState = getStepStatus(step.key);
                const IconComponent = step.icon;

                return (
                  <div key={step.key} className="flex flex-col items-center text-center space-y-2">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                        stepState === 'completed'
                          ? 'bg-brand text-white shadow-md shadow-brand/20'
                          : stepState === 'current'
                          ? 'bg-amber-400 text-white ring-4 ring-amber-100 shadow-md animate-bounce'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] font-black text-gray-800 block leading-tight">
                        {step.label}
                      </span>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mt-0.5">
                        {stepState === 'completed' ? 'Done' : stepState === 'current' ? 'In Progress' : 'Pending'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-red-50 rounded-2xl border border-red-200 text-center space-y-1">
            <h4 className="text-sm font-bold text-red-700">Order has been cancelled</h4>
            <p className="text-xs text-red-600">This order is no longer in dispatch or delivery.</p>
          </div>
        )}

        {/* Partner & Delivery Confirmation Code Box */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Assigned Delivery Partner Card */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <Bike className="w-4 h-4 text-brand" />
              <span>Assigned Delivery Partner</span>
            </div>

            {order.deliveryPartner ? (
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-gray-900">{order.deliveryPartner.name}</h4>
                  <p className="text-xs text-gray-500 font-semibold">Your delivery driver</p>
                </div>
                {order.deliveryPartner.phone && (
                  <a
                    href={`tel:${order.deliveryPartner.phone}`}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 hover:border-brand text-brand rounded-xl text-xs font-bold shadow-xs transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Driver</span>
                  </a>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">
                Our kitchen is assigning a nearby delivery partner to your order. You will see their details here shortly!
              </p>
            )}
          </div>

          {/* Delivery OTP / Confirmation Code */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-brand" />
              <span>Doorstep Delivery Code</span>
            </div>
            <p className="text-xs text-gray-600 leading-snug">
              Share this single-use code with your delivery partner upon arrival to confirm receipt:
            </p>
            <div className="pt-1">
              <span className="text-2xl font-black tracking-widest text-brand bg-white px-4 py-1.5 rounded-xl border border-emerald-200 inline-block shadow-xs">
                {order.deliveryConfirmationCode || '••••'}
              </span>
            </div>
          </div>
        </div>

        {/* Delivery Destination Address */}
        <div className="p-4 bg-gray-50/70 rounded-2xl border border-gray-100 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
            <MapPin className="w-3.5 h-3.5 text-brand" />
            <span>Delivery Destination (Manually Verified)</span>
          </div>
          <p className="text-sm font-bold text-gray-800">
            {order.deliveryAddress?.fullName} • {order.deliveryAddress?.phone}
          </p>
          <p className="text-xs text-gray-600">
            {order.deliveryAddress?.houseNumber}, {order.deliveryAddress?.streetName}, {order.deliveryAddress?.area},{' '}
            {order.deliveryAddress?.city} - {order.deliveryAddress?.postalCode}
          </p>
          {order.deliveryAddress?.landmark && (
            <p className="text-[11px] text-gray-500 font-semibold">
              Landmark: {order.deliveryAddress.landmark}
            </p>
          )}
          {order.deliveryAddress?.deliveryInstructions && (
            <p className="text-[11px] text-brand-dark italic">
              Instructions: "{order.deliveryAddress.deliveryInstructions}"
            </p>
          )}
        </div>
      </div>

      {/* Ordered Items Summary */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-gray-900 tracking-tight">Ordered Items</h3>
        <div className="divide-y divide-gray-100">
          {(order.items || []).map((item, idx) => (
            <div key={idx} className="py-2.5 flex justify-between items-center text-xs">
              <div>
                <span className="font-bold text-gray-800">{item.name}</span>
                <span className="text-gray-400 block text-[10px] font-semibold">Qty: {item.quantity} x ₹{item.price.toFixed(2)}</span>
              </div>
              <span className="font-black text-gray-900">₹{item.total.toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-gray-100 space-y-1 text-xs">
          <div className="flex justify-between font-semibold text-gray-500">
            <span>Subtotal</span>
            <span>₹{order.subtotal?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold text-gray-500">
            <span>Tax</span>
            <span>₹{order.tax?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t border-dashed border-gray-200">
            <span>Grand Total</span>
            <span className="text-brand">₹{order.grandTotal?.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Cancellation */}
      <ConfirmDialog
        isOpen={isCancelConfirmOpen}
        onClose={() => setIsCancelConfirmOpen(false)}
        onConfirm={handleCancelOrder}
        title="Cancel Order Confirmation"
        message="Are you sure you want to cancel this order? If food preparation has already begun, cancellation may not be possible."
        confirmText="Confirm Cancellation"
        type="danger"
      />
    </div>
  );
};

export default TrackOrder;
