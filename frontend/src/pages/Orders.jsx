import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Search, Printer, RotateCcw, AlertTriangle, Eye, Calendar } from 'lucide-react';
import Toast from '../components/Toast';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Invoice from '../components/Invoice';

const Orders = () => {
  const { user } = useAuth();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Business settings state
  const [settings, setSettings] = useState(null);
  const [currency, setCurrency] = useState('₹');

  // UI state
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState('');

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchOrders();
    fetchSettings();
  }, [search, statusFilter, startDate, endDate, page]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get('/orders', {
        params: {
          search,
          status: statusFilter,
          startDate,
          endDate,
          page,
          limit: 15,
        },
      });
      if (response.data.success) {
        setOrders(response.data.data);
        setTotalPages(response.data.pagination.pages);
      }
    } catch (err) {
      console.error(err);
      showToast('Error fetching sales history.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      if (response.data.success && response.data.data) {
        setSettings(response.data.data);
        setCurrency(response.data.data.currency || '₹');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
  };

  const handleToastClose = () => setToastMsg(null);

  const handleOpenStatusConfirm = (order, status) => {
    setSelectedOrder(order);
    setTargetStatus(status);
    setIsStatusConfirmOpen(true);
  };

  const handleStatusChangeSubmit = async () => {
    try {
      const response = await api.put(`/orders/${selectedOrder._id}/status`, { status: targetStatus });
      if (response.data.success) {
        showToast(`Order status updated to ${targetStatus}!`, 'success');
        fetchOrders();
        // Update detail view if open
        if (isDetailOpen && selectedOrder._id === response.data.data._id) {
          setSelectedOrder(response.data.data);
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update order status.', 'error');
    }
  };

  const handlePrintReceipt = (orderObj) => {
    // Inject printable receipt root container, print, and destroy
    const printRoot = document.createElement('div');
    printRoot.id = 'printable-receipt-root';
    document.body.appendChild(printRoot);

    import('react-dom/client').then((ReactDOM) => {
      const root = ReactDOM.createRoot(printRoot);
      root.render(<Invoice order={orderObj} businessSettings={settings} />);
      
      setTimeout(() => {
        window.print();
        document.body.removeChild(printRoot);
      }, 500);
    });
  };

  return (
    <div className="space-y-6 font-sans">
      {toastMsg && <Toast message={toastMsg} type={toastType} onClose={handleToastClose} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight font-display">
            Sales & Orders History
          </h2>
          <p className="text-sm text-gray-500 font-semibold mt-0.5">
            Browse invoices, refund transactions, and print physical receipt copies
          </p>
        </div>
      </div>

      {/* Filter and search parameters */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-center">
        {/* Search */}
        <div className="relative col-span-1 lg:col-span-2">
          <Search className="absolute left-3.5 top-3 w-4.5 h-4.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search Order ID or Cashier name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>

        {/* Status */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            <option value="">All Statuses</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Refunded">Refunded</option>
          </select>
        </div>

        {/* Date Start */}
        <div className="relative">
          <Calendar className="absolute right-3.5 top-3 w-4.5 h-4.5 text-gray-400 pointer-events-none" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>

        {/* Date End */}
        <div className="relative">
          <Calendar className="absolute right-3.5 top-3 w-4.5 h-4.5 text-gray-400 pointer-events-none" />
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider text-left">
              <tr>
                <th className="px-6 py-4">Invoice #</th>
                <th className="px-6 py-4">Date / Time</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4 text-center">Items</th>
                <th className="px-6 py-4 text-right">Bill Total</th>
                <th className="px-6 py-4 text-center">Payment Mode</th>
                <th className="px-6 py-4 text-center">Cashier</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto"></div>
                  </td>
                </tr>
              ) : orders.length > 0 ? (
                orders.map(order => {
                  const orderDate = new Date(order.date || order.createdAt);
                  const itemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
                  
                  const statusStyles = {
                    Completed: 'bg-green-50 text-brand border border-green-100',
                    Cancelled: 'bg-red-50 text-red-500 border border-red-100',
                    Refunded: 'bg-amber-50 text-amber-600 border border-amber-100',
                  };

                  return (
                    <tr key={order._id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap">
                        {order.orderNumber}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                        {orderDate.toLocaleDateString('en-IN')} {orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap">
                        {order.customerDetails?.name || 'Walk-in Customer'}
                      </td>
                      <td className="px-6 py-4 text-center">{itemsCount}</td>
                      <td className="px-6 py-4 text-right text-gray-900 font-black">
                        {currency}{order.grandTotal.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-gray-500">{order.paymentMethod}</td>
                      <td className="px-6 py-4 text-center text-gray-500 capitalize">{order.cashierName || 'Staff'}</td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${statusStyles[order.status]}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsDetailOpen(true);
                            }}
                            className="p-1.5 bg-gray-50 hover:bg-brand/10 text-gray-600 hover:text-brand rounded-lg transition-colors"
                            title="View Invoice Items"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handlePrintReceipt(order)}
                            className="p-1.5 bg-gray-50 hover:bg-brand/10 text-gray-600 hover:text-brand rounded-lg transition-colors"
                            title="Reprint Invoice"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && order.status === 'Completed' && (
                            <button
                              onClick={() => handleOpenStatusConfirm(order, 'Refunded')}
                              className="p-1.5 bg-gray-50 hover:bg-amber-50 text-gray-400 hover:text-amber-500 rounded-lg transition-colors"
                              title="Refund Order (Restores Stock)"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400 font-semibold">
                    No sales orders matched your search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 border-t border-gray-100 px-6 py-4 flex items-center justify-between">
            <span className="text-xs text-gray-500 font-semibold">
              Showing Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Invoice: ${selectedOrder?.orderNumber}`}
        size="md"
      >
        {selectedOrder && (
          <div className="space-y-6 font-sans">
            {/* Header meta */}
            <div className="grid grid-cols-2 gap-4 text-xs font-medium text-gray-500 border-b border-gray-100 pb-4">
              <div>
                <span className="block text-gray-400">CUSTOMER</span>
                <strong className="text-sm font-black text-gray-900 leading-tight">
                  {selectedOrder.customerDetails?.name || 'Walk-in Customer'}
                </strong>
                {selectedOrder.customerDetails?.phone && <span className="block mt-0.5">{selectedOrder.customerDetails.phone}</span>}
              </div>
              <div className="text-right">
                <span className="block text-gray-400">TRANSACTION DATA</span>
                <strong className="block text-gray-900">
                  {new Date(selectedOrder.date || selectedOrder.createdAt).toLocaleDateString('en-IN')}
                </strong>
                <span>Logged by Cashier: <strong className="capitalize">{selectedOrder.cashierName || 'Staff'}</strong></span>
              </div>
            </div>

            {/* Items list */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Ordered Items
              </span>
              <div className="space-y-2 border border-gray-100 rounded-2xl p-3.5 bg-gray-50 max-h-48 overflow-y-auto">
                {selectedOrder.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs font-bold text-gray-800">
                    <div>
                      <span>{item.name}</span>
                      <span className="text-[10px] text-gray-400 font-semibold block">
                        {item.quantity} x {currency}{item.price.toFixed(2)}
                      </span>
                    </div>
                    <span>{currency}{item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals Summary */}
            <div className="space-y-1.5 text-xs font-bold text-gray-600 border-t border-gray-100 pt-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-gray-900">{currency}{selectedOrder.subtotal?.toFixed(2)}</span>
              </div>
              {selectedOrder.discount > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Discount</span>
                  <span>-{currency}{selectedOrder.discount?.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tax</span>
                <span className="text-gray-900">{currency}{selectedOrder.tax?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-gray-900 border-t border-dashed border-gray-200 pt-3">
                <span>Grand Total</span>
                <span>{currency}{selectedOrder.grandTotal?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-gray-400 border-t border-dotted border-gray-200 pt-2 font-medium">
                <span>Payment Method</span>
                <span className="font-bold text-gray-900 uppercase">{selectedOrder.paymentMethod}</span>
              </div>
            </div>

            {/* Actions: Print and Refund */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              {isAdmin && selectedOrder.status === 'Completed' && (
                <button
                  onClick={() => {
                    setIsDetailOpen(false);
                    handleOpenStatusConfirm(selectedOrder, 'Refunded');
                  }}
                  className="px-4 py-2 border border-amber-200 hover:bg-amber-50 text-amber-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Refund Order
                </button>
              )}
              <button
                onClick={() => handlePrintReceipt(selectedOrder)}
                className="px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-bold shadow-lg shadow-brand/10 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Receipt
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Status Change (Refund / Cancel) */}
      <ConfirmDialog
        isOpen={isStatusConfirmOpen}
        onClose={() => setIsStatusConfirmOpen(false)}
        onConfirm={handleStatusChangeSubmit}
        title="Refund Order Confirmation"
        message={`Are you sure you want to change the status of order #${selectedOrder?.orderNumber} to ${targetStatus}? This will mark the payment failed, restore item stock counts back to inventory levels, and register a Return transaction.`}
        confirmText="Confirm Refund"
        type="warning"
      />
    </div>
  );
};

export default Orders;
