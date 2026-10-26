import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Package, Clock, ArrowRight, MapPin, CheckCircle2 } from 'lucide-react';
import Toast from '../components/Toast';

const CustomerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get('/customer/orders');
      if (response.data.success) {
        setOrders(response.data.data);
      }
    } catch (err) {
      console.error(err);
      setToastMsg('Failed to load your orders.');
    } finally {
      setLoading(false);
    }
  };

  const statusBadges = {
    order_placed: { label: 'Order Placed', color: 'bg-blue-50 text-blue-600 border-blue-200' },
    confirmed: { label: 'Confirmed', color: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
    preparing: { label: 'Preparing', color: 'bg-amber-50 text-amber-600 border-amber-200' },
    ready_for_dispatch: { label: 'Ready for Dispatch', color: 'bg-purple-50 text-purple-600 border-purple-200' },
    assigned: { label: 'Partner Assigned', color: 'bg-cyan-50 text-cyan-600 border-cyan-200' },
    picked_up: { label: 'Picked Up', color: 'bg-orange-50 text-orange-600 border-orange-200' },
    out_for_delivery: { label: 'Out for Delivery', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    delivered: { label: 'Delivered', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    cancelled: { label: 'Cancelled', color: 'bg-red-50 text-red-600 border-red-200' },
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      {toastMsg && <Toast message={toastMsg} type="error" onClose={() => setToastMsg(null)} />}

      <div>
        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight font-display">
          My Order History
        </h2>
        <p className="text-sm text-gray-500 font-semibold mt-0.5">
          Track active deliveries and review your past meals
        </p>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="py-16 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto"></div>
          </div>
        ) : orders.length > 0 ? (
          orders.map((order) => {
            const badge = statusBadges[order.deliveryStatus] || {
              label: order.deliveryStatus || order.status,
              color: 'bg-gray-100 text-gray-700',
            };
            const itemsCount = (order.items || []).reduce((sum, i) => sum + i.quantity, 0);
            const orderDate = new Date(order.date || order.createdAt);

            return (
              <div
                key={order._id}
                className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-gray-900 text-base">#{order.orderNumber}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 font-medium">
                    {orderDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} at{' '}
                    {orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>

                  <p className="text-xs text-gray-700 font-semibold">
                    {itemsCount} item{itemsCount > 1 ? 's' : ''}:{' '}
                    <span className="text-gray-500 font-normal">
                      {order.items?.map((i) => `${i.name} (x${i.quantity})`).join(', ')}
                    </span>
                  </p>

                  {order.deliveryAddress?.city && (
                    <div className="flex items-center gap-1 text-[11px] text-gray-400 font-medium">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span>
                        {order.deliveryAddress.houseNumber}, {order.deliveryAddress.streetName}, {order.deliveryAddress.city}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end pt-3 md:pt-0 border-t md:border-t-0 border-gray-100">
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Total</span>
                    <span className="text-lg font-black text-brand">₹{order.grandTotal.toFixed(2)}</span>
                  </div>

                  <button
                    onClick={() => navigate(`/track-order/${order._id}`)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-bold shadow-md shadow-brand/10 transition-colors cursor-pointer"
                  >
                    <span>Track Order</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 p-8 space-y-3">
            <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center mx-auto">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900">No orders placed yet</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Your previous delivery orders will appear here. Hungry? Browse our fresh menu now!
            </p>
            <button
              onClick={() => navigate('/menu')}
              className="px-4 py-2 bg-brand text-white font-bold rounded-xl text-xs shadow-md shadow-brand/15 cursor-pointer"
            >
              Order Food Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerOrders;
