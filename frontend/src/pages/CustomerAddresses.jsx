import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, MapPin, Trash2, Edit2, CheckCircle2 } from 'lucide-react';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import CustomerAddressForm from '../components/CustomerAddressForm';

const CustomerAddresses = () => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [deletingAddress, setDeletingAddress] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const response = await api.get('/customer/addresses');
      if (response.data.success) {
        setAddresses(response.data.data);
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading saved addresses.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
  };

  const handleOpenCreate = () => {
    setEditingAddress(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (addr) => {
    setEditingAddress(addr);
    setIsModalOpen(true);
  };

  const handleSaveAddress = async (formData) => {
    setSubmitting(true);
    try {
      if (editingAddress) {
        const response = await api.put(`/customer/addresses/${editingAddress._id}`, formData);
        if (response.data.success) {
          showToast('Address updated successfully!');
          fetchAddresses();
          setIsModalOpen(false);
        }
      } else {
        const response = await api.post('/customer/addresses', formData);
        if (response.data.success) {
          showToast('Delivery address saved successfully!');
          fetchAddresses();
          setIsModalOpen(false);
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save address.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingAddress) return;
    try {
      const response = await api.delete(`/customer/addresses/${deletingAddress._id}`);
      if (response.data.success) {
        showToast('Address deleted successfully.');
        fetchAddresses();
      }
    } catch (err) {
      showToast('Failed to delete address.', 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      {toastMsg && <Toast message={toastMsg} type={toastType} onClose={() => setToastMsg(null)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight font-display">
            My Delivery Addresses
          </h2>
          <p className="text-sm text-gray-500 font-semibold mt-0.5">
            Manage your manually entered delivery destinations for food orders
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-xl text-sm font-bold shadow-lg shadow-brand/10 transition-colors cursor-pointer"
        >
          <Plus className="w-4.5 h-4.5" />
          <span>Add New Address</span>
        </button>
      </div>

      {/* Address cards list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto"></div>
          </div>
        ) : addresses.length > 0 ? (
          addresses.map((addr) => (
            <div
              key={addr._id}
              className={`p-5 rounded-3xl border bg-white shadow-sm flex flex-col justify-between transition-all ${
                addr.isDefault ? 'border-brand/40 ring-1 ring-brand/20' : 'border-gray-100'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-gray-900">{addr.fullName}</span>
                    {addr.isDefault && (
                      <span className="px-2 py-0.5 bg-brand/10 text-brand text-[10px] font-black uppercase rounded-full inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Default
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 font-bold">{addr.phone}</span>
                </div>

                <div className="text-xs text-gray-600 leading-relaxed space-y-0.5">
                  <p className="font-semibold text-gray-800">
                    {addr.houseNumber}, {addr.streetName}
                  </p>
                  <p>
                    {addr.area}, {addr.city} - {addr.postalCode}
                  </p>
                  <p className="text-gray-400">{addr.state}</p>
                  {addr.landmark && (
                    <p className="text-[11px] text-gray-500 font-medium pt-1">
                      Landmark: <span className="font-bold text-gray-700">{addr.landmark}</span>
                    </p>
                  )}
                  {addr.deliveryInstructions && (
                    <p className="text-[11px] text-brand-dark font-medium italic pt-1">
                      Instructions: "{addr.deliveryInstructions}"
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-gray-100">
                <button
                  onClick={() => handleOpenEdit(addr)}
                  className="p-1.5 bg-gray-50 hover:bg-brand/10 text-gray-600 hover:text-brand rounded-lg transition-colors cursor-pointer"
                  title="Edit Address"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setDeletingAddress(addr);
                    setIsDeleteOpen(true);
                  }}
                  className="p-1.5 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                  title="Delete Address"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-gray-100 p-8 space-y-3">
            <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center mx-auto">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900">No saved addresses found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Add your home, office, or apartment address to get started with seamless delivery orders.
            </p>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-brand text-white font-bold rounded-xl text-xs shadow-md shadow-brand/15 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Your First Address</span>
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Address Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAddress ? 'Edit Delivery Address' : 'Add Manual Delivery Address'}
        size="md"
      >
        <CustomerAddressForm
          initialData={editingAddress}
          onSubmit={handleSaveAddress}
          onCancel={() => setIsModalOpen(false)}
          submitting={submitting}
        />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Address"
        message="Are you sure you want to delete this saved delivery address? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
};

export default CustomerAddresses;
