import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Edit2, Trash2, Search, Calendar, Filter, TrendingDown } from 'lucide-react';
import Toast from '../components/Toast';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';

const Expenses = () => {
  const { user } = useAuth();
  
  const [expenses, setExpenses] = useState([]);
  const [stats, setStats] = useState({ todayTotal: 0, monthTotal: 0 });
  const [loading, setLoading] = useState(true);
  
  // Search & Filters State
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // UI triggers state
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [currency, setCurrency] = useState('₹');

  // Form Fields State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Raw materials');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  const isAdmin = user?.role === 'admin';

  const categories = ['Rent', 'Electricity', 'Salary', 'Raw materials', 'Maintenance', 'Marketing', 'Other'];

  useEffect(() => {
    fetchExpenses();
    fetchSettings();
  }, [search, categoryFilter, startDate, endDate]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const response = await api.get('/expenses', {
        params: {
          search,
          category: categoryFilter,
          startDate,
          endDate,
        },
      });

      if (response.data.success) {
        setExpenses(response.data.data);
        setStats(response.data.stats);
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading expenses list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      if (response.data.success && response.data.data) {
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

  const resetForm = () => {
    setSelectedExpense(null);
    setTitle('');
    setCategory('Raw materials');
    setAmount('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('Cash');
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (exp) => {
    setSelectedExpense(exp);
    setTitle(exp.title);
    setCategory(exp.category);
    setAmount(exp.amount);
    setDescription(exp.description || '');
    setDate(new Date(exp.date || exp.createdAt).toISOString().split('T')[0]);
    setPaymentMethod(exp.paymentMethod || 'Cash');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (parseFloat(amount) < 0) {
      showToast('Amount cannot be negative.', 'error');
      return;
    }

    const payload = {
      title,
      category,
      amount: parseFloat(amount),
      description,
      date: date ? new Date(date) : new Date(),
      paymentMethod,
    };

    try {
      if (selectedExpense) {
        const response = await api.put(`/expenses/${selectedExpense._id}`, payload);
        if (response.data.success) {
          showToast('Expense updated successfully!', 'success');
          fetchExpenses();
          setIsModalOpen(false);
        }
      } else {
        const response = await api.post('/expenses', payload);
        if (response.data.success) {
          showToast('Expense logged successfully!', 'success');
          fetchExpenses();
          setIsModalOpen(false);
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error occurred during save.', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedExpense) return;
    try {
      const response = await api.delete(`/expenses/${selectedExpense._id}`);
      if (response.data.success) {
        showToast('Expense deleted successfully!', 'success');
        fetchExpenses();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error deleting expense.', 'error');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {toastMsg && <Toast message={toastMsg} type={toastType} onClose={handleToastClose} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight font-display">
            Expense Logging
          </h2>
          <p className="text-sm text-gray-500 font-semibold mt-0.5">
            Log raw materials cost, salary payout, electricity bills, and rent expenses
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-xl text-sm font-bold shadow-lg shadow-brand/10 transition-colors cursor-pointer"
        >
          <Plus className="w-4.5 h-4.5" />
          Log Expense
        </button>
      </div>

      {/* Expense Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Today's Expenses</span>
            <span className="text-2xl font-black text-gray-900 font-display mt-1 block">
              {currency}{stats.todayTotal.toFixed(2)}
            </span>
          </div>
          <div className="p-3 bg-red-50 text-red-500 border border-red-100 rounded-2xl">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">This Month's Expenses</span>
            <span className="text-2xl font-black text-gray-900 font-display mt-1 block">
              {currency}{stats.monthTotal.toFixed(2)}
            </span>
          </div>
          <div className="p-3 bg-red-50 text-red-500 border border-red-100 rounded-2xl">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and search parameters */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-center">
        {/* Search */}
        <div className="relative col-span-1 lg:col-span-2">
          <Search className="absolute left-3.5 top-3 w-4.5 h-4.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by Title or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>

        {/* Category */}
        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Date Start */}
        <div className="relative">
          <Calendar className="absolute right-3.5 top-3 w-4.5 h-4.5 text-gray-400 pointer-events-none" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>

        {/* Date End */}
        <div className="relative">
          <Calendar className="absolute right-3.5 top-3 w-4.5 h-4.5 text-gray-400 pointer-events-none" />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider text-left">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4 text-center">Category</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-center">Payment Mode</th>
                <th className="px-6 py-4">Description</th>
                {isAdmin && <th className="px-6 py-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="text-center py-10 text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto"></div>
                  </td>
                </tr>
              ) : expenses.length > 0 ? (
                expenses.map(exp => (
                  <tr key={exp._id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 text-xs font-semibold text-gray-500 whitespace-nowrap">
                      {new Date(exp.date || exp.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-bold whitespace-nowrap">{exp.title}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2.5 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs font-bold whitespace-nowrap">
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-red-500 font-black whitespace-nowrap">
                      -{currency}{exp.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center font-semibold text-gray-500">{exp.paymentMethod || 'Cash'}</td>
                    <td className="px-6 py-4 text-gray-500 truncate max-w-[200px]" title={exp.description}>
                      {exp.description || 'N/A'}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleOpenEditModal(exp)}
                            className="p-1.5 bg-gray-50 hover:bg-brand/10 text-gray-600 hover:text-brand rounded-lg transition-colors"
                            title="Edit Expense"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedExpense(exp);
                              setIsDeleteOpen(true);
                            }}
                            className="p-1.5 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                            title="Delete Expense"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="text-center py-12 text-gray-400 font-semibold">
                    No operational expenses recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log / Edit Expense modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedExpense ? 'Edit Expense' : 'Log Expense'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Expense Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Coffee Beans shipment"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="4500.00"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Expense Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Description / Bill Notes</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Paid raw beans supplier, invoice #24"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 h-20 resize-none"
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
              Log Expense
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Expense Log"
        message={`Are you sure you want to permanently delete this expense log of ${currency}${selectedExpense?.amount.toFixed(2)}?`}
        confirmText="Delete Log"
        type="danger"
      />
    </div>
  );
};

export default Expenses;
