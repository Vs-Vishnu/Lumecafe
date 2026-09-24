import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Edit2, Trash2, Search, Eye, Phone, Mail, MapPin, ClipboardList } from 'lucide-react';
import Toast from '../components/Toast';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';

const Customers = () => {
  const { user } = useAuth();
  
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Detail state
  const [customerDetails, setCustomerDetails] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // UI triggers state
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [currency, setCurrency] = useState('₹');

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchCustomers();
    fetchSettings();
  }, [search]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/customers', {
        params: { search },
      });
      if (response.data.success) {
        setCustomers(response.data.data);
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading customers.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data.success && res.data.data) {
        setCurrency(res.data.data.currency || '₹');
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

  const resetForm = () => {
    setSelectedCustomer(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setNotes('');
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cust) => {
    setSelectedCustomer(cust);
    setName(cust.name);
    setPhone(cust.phone || '');
    setEmail(cust.email || '');
    setAddress(cust.address || '');
    setNotes(cust.notes || '');
    setIsModalOpen(true);
  };

  const handleViewDetails = async (cust) => {
    setDetailLoading(true);
    setIsDetailOpen(true);
    try {
      const response = await api.get(`/customers/${cust._id}`);
      if (response.data.success) {
        setCustomerDetails(response.data.data);
      }
    } catch (err) {
      console.error(err);
      showToast('Error fetching customer history.', 'error');
      setIsDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name) {
      showToast('Customer name is required.', 'error');
      return;
    }

    const payload = { name, phone, email, address, notes };

    try {
      if (selectedCustomer) {
        const response = await api.put(`/customers/${selectedCustomer._id}`, payload);
        if (response.data.success) {
          showToast('Customer updated successfully!', 'success');
          fetchCustomers();
          setIsModalOpen(false);
        }
      } else {
        const response = await api.post('/customers', payload);
        if (response.data.success) {
          showToast('Customer registered successfully!', 'success');
          fetchCustomers();
          setIsModalOpen(false);
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error occurred during save.', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCustomer) return;
    try {
      const response = await api.delete(`/customers/${selectedCustomer._id}`);
      if (response.data.success) {
        showToast('Customer profile deleted successfully!', 'success');
        fetchCustomers();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error deleting customer profile.', 'error');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {toastMsg && <Toast message={toastMsg} type={toastType} onClose={handleToastClose} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight font-display">
            Customer Directory
          </h2>
          <p className="text-sm text-gray-500 font-semibold mt-0.5">
            Manage customer contact information, notes, and aggregate sales histories
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-xl text-sm font-bold shadow-lg shadow-brand/10 transition-colors cursor-pointer"
        >
          <Plus className="w-4.5 h-4.5" />
          Add Customer
        </button>
      </div>

      {/* Search Filter */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-3 w-4.5 h-4.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by Name or Phone number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
      </div>

      {/* Table grid */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider text-left">
              <tr>
                <th className="px-6 py-4">Customer Name</th>
                <th className="px-6 py-4">Phone Number</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Address</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto"></div>
                  </td>
                </tr>
              ) : customers.length > 0 ? (
                customers.map(c => (
                  <tr key={c._id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 text-gray-900 font-bold">{c.name}</td>
                    <td className="px-6 py-4 text-gray-500 font-semibold">{c.phone || 'N/A'}</td>
                    <td className="px-6 py-4 text-gray-500">{c.email || 'N/A'}</td>
                    <td className="px-6 py-4 text-gray-500 truncate max-w-[200px]" title={c.address}>{c.address || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleViewDetails(c)}
                          className="p-1.5 bg-gray-50 hover:bg-brand/10 text-gray-600 hover:text-brand rounded-lg transition-colors"
                          title="View Sales History"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(c)}
                          className="p-1.5 bg-gray-50 hover:bg-brand/10 text-gray-600 hover:text-brand rounded-lg transition-colors"
                          title="Edit Customer Info"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setSelectedCustomer(c);
                              setIsDeleteOpen(true);
                            }}
                            className="p-1.5 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                            title="Delete Customer Profile"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400 font-semibold">
                    No customers found matching filter constraints.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit customer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedCustomer ? 'Edit Customer Info' : 'Add Customer'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Customer Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Physical street address details..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 h-20 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Internal Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Prefers cold coffee, regular cafe visitor"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold bg-brand hover:bg-brand-dark text-white rounded-xl shadow-lg shadow-brand/10"
            >
              Save Details
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Customer Profile"
        message={`Are you sure you want to permanently delete ${selectedCustomer?.name}'s details? Historical order logs will not be affected.`}
        confirmText="Delete Profile"
        type="danger"
      />

      {/* View Customer Details & Purchase metrics modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Customer Insights Profile"
        size="lg"
      >
        {detailLoading ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto"></div>
          </div>
        ) : customerDetails ? (
          <div className="space-y-6">
            {/* Main Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 border border-gray-100 rounded-2xl p-4">
              <div className="space-y-2 text-xs font-medium text-gray-600">
                <h4 className="text-sm font-black text-gray-900 mb-2">{customerDetails.customer.name}</h4>
                <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-brand" /> {customerDetails.customer.phone || 'N/A'}</div>
                <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-brand" /> {customerDetails.customer.email || 'N/A'}</div>
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-brand" /> {customerDetails.customer.address || 'N/A'}</div>
              </div>
              
              {/* Aggregated values */}
              <div className="grid grid-cols-2 gap-3.5 bg-white border border-gray-100 rounded-xl p-3.5">
                <div className="text-center border-r border-gray-50">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Total Orders</span>
                  <span className="text-xl font-black text-gray-900 block mt-1">{customerDetails.metrics.totalOrders}</span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Total Spent</span>
                  <span className="text-xl font-black text-brand block mt-1">{currency}{customerDetails.metrics.totalSpent.toFixed(2)}</span>
                </div>
                <div className="col-span-2 text-center border-t border-gray-50 pt-2 text-[10px] font-bold text-gray-400 uppercase">
                  Last Order: {customerDetails.metrics.lastOrderDate ? new Date(customerDetails.metrics.lastOrderDate).toLocaleDateString('en-IN') : 'Never'}
                </div>
              </div>
            </div>

            {/* Notes Section if any */}
            {customerDetails.customer.notes && (
              <div className="text-xs p-3 bg-amber-50/50 border border-amber-100 text-amber-800 rounded-xl">
                <strong>Internal Note:</strong> {customerDetails.customer.notes}
              </div>
            )}

            {/* Order History ledger table */}
            <div className="space-y-3">
              <h5 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-brand" />
                Purchase Transaction Ledger
              </h5>
              <div className="border border-gray-100 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="min-w-full text-xs divide-y divide-gray-100 text-left">
                  <thead className="bg-gray-50 font-bold text-gray-400 uppercase">
                    <tr>
                      <th className="px-4 py-2">Invoice #</th>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2 text-right">Bill Total</th>
                      <th className="px-4 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="font-semibold text-gray-700 divide-y divide-gray-100">
                    {customerDetails.orders.map(order => (
                      <tr key={order._id}>
                        <td className="px-4 py-2 font-bold text-gray-900">{order.orderNumber}</td>
                        <td className="px-4 py-2 text-gray-400">{new Date(order.date || order.createdAt).toLocaleDateString('en-IN')}</td>
                        <td className="px-4 py-2 text-right text-gray-900">₹{order.grandTotal.toFixed(2)}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-black ${
                            order.status === 'Completed' ? 'bg-green-50 text-brand' : 'bg-red-50 text-red-500'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl"
              >
                Close Profile
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default Customers;
