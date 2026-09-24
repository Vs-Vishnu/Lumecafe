import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Edit2, Trash2, Shield, Lock, UserX, UserCheck } from 'lucide-react';
import Toast from '../components/Toast';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';

const Users = () => {
  const { user: currentUser } = useAuth();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI triggers state
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('cashier');
  const [status, setStatus] = useState('active');
  const [resetPasswordVal, setResetPasswordVal] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users');
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading cashiers registry.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
  };

  const handleToastClose = () => setToastMsg(null);

  const resetForm = () => {
    setSelectedUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('cashier');
    setStatus('active');
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (u) => {
    setSelectedUser(u);
    setName(u.name);
    setEmail(u.email);
    setRole(u.role);
    setStatus(u.status);
    setIsModalOpen(true);
  };

  const handleOpenPasswordModal = (u) => {
    setSelectedUser(u);
    setResetPasswordVal('');
    setIsPasswordModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedUser && !password) {
      showToast('Password is required for new accounts.', 'error');
      return;
    }

    const payload = {
      name,
      email,
      role,
      status,
    };
    if (!selectedUser) payload.password = password;

    try {
      if (selectedUser) {
        const response = await api.put(`/users/${selectedUser._id}`, payload);
        if (response.data.success) {
          showToast('User account updated successfully!', 'success');
          fetchUsers();
          setIsModalOpen(false);
        }
      } else {
        const response = await api.post('/users', payload);
        if (response.data.success) {
          showToast('Cashier user registered successfully!', 'success');
          fetchUsers();
          setIsModalOpen(false);
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error occurred during save.', 'error');
    }
  };

  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
    if (!resetPasswordVal) {
      showToast('Please enter a new password.', 'error');
      return;
    }

    try {
      const response = await api.put(`/users/${selectedUser._id}/reset-password`, { password: resetPasswordVal });
      if (response.data.success) {
        showToast(`Password updated successfully for ${selectedUser.name}!`, 'success');
        setIsPasswordModalOpen(false);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Reset password failed.', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;
    try {
      const response = await api.delete(`/users/${selectedUser._id}`);
      if (response.data.success) {
        showToast('Account permanently removed.', 'success');
        fetchUsers();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error deleting account.', 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans">
      {toastMsg && <Toast message={toastMsg} type={toastType} onClose={handleToastClose} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight font-display">
            Staff & Cashier Profiles
          </h2>
          <p className="text-sm text-gray-500 font-semibold mt-0.5">
            Admin console to create staff logins, assign access privileges, and change status
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-xl text-sm font-bold shadow-lg shadow-brand/10 transition-colors cursor-pointer"
        >
          <Plus className="w-4.5 h-4.5" />
          Add Cashier
        </button>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider text-left">
            <tr>
              <th className="px-6 py-4">User Name</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4 text-center">System Role</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-center">Created Date</th>
              <th className="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto"></div>
                </td>
              </tr>
            ) : users.length > 0 ? (
              users.map(u => (
                <tr key={u._id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-50 border border-brand/20 text-brand flex items-center justify-center font-bold text-xs uppercase">
                      {u.name.charAt(0)}
                    </div>
                    <span>{u.name}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 font-semibold">{u.email}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold inline-flex items-center gap-1 capitalize`}>
                      <Shield className="w-3 h-3 text-brand" />
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase inline-flex items-center gap-1 ${
                        u.status === 'active'
                          ? 'bg-green-100 text-brand'
                          : 'bg-red-100 text-red-500'
                      }`}
                    >
                      {u.status === 'active' ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-xs text-gray-400 font-semibold">
                    {new Date(u.createdAt).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleOpenPasswordModal(u)}
                        className="p-1.5 bg-gray-50 hover:bg-brand/10 text-gray-600 hover:text-brand rounded-lg transition-colors"
                        title="Reset Password"
                      >
                        <Lock className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(u)}
                        className="p-1.5 bg-gray-50 hover:bg-brand/10 text-gray-600 hover:text-brand rounded-lg transition-colors"
                        title="Edit Account Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {u._id !== currentUser?._id && (
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setIsDeleteOpen(true);
                          }}
                          className="p-1.5 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                          title="Remove Account"
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
                <td colSpan={6} className="text-center py-12 text-gray-400 font-semibold">
                  No system users registered.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit user details modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedUser ? 'Edit User Details' : 'Register User'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Amit Kumar"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. cashier2@example.com"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
          {!selectedUser && (
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Password *</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Set initial password"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">System Role</label>
              <select
                value={role}
                disabled={selectedUser && selectedUser._id === currentUser?._id}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
              >
                <option value="cashier">Cashier</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Status</label>
              <select
                value={status}
                disabled={selectedUser && selectedUser._id === currentUser?._id}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
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
              Save Cashier
            </button>
          </div>
        </form>
      </Modal>

      {/* Force Reset Password modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title={`Reset Password for ${selectedUser?.name}`}
      >
        <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">New password *</label>
            <input
              type="password"
              required
              value={resetPasswordVal}
              onChange={(e) => setResetPasswordVal(e.target.value)}
              placeholder="Enter new account password"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold bg-brand hover:bg-brand-dark text-white rounded-xl shadow-lg shadow-brand/10"
            >
              Change Password
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Remove Staff Account"
        message={`Are you sure you want to permanently delete Amit Kumar's staff log credentials? This cashier will not be able to log in to LumeBills anymore.`}
        confirmText="Remove Account"
        type="danger"
      />
    </div>
  );
};

export default Users;
