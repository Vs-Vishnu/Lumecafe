import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import Toast from '../components/Toast';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';

const Categories = () => {
  const { user } = useAuth();
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI trigger states
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await api.get('/categories');
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (err) {
      console.error(err);
      showToast('Error fetching menu categories.', 'error');
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
    setSelectedCategory(null);
    setName('');
    setDescription('');
    setStatus('active');
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat) => {
    setSelectedCategory(cat);
    setName(cat.name);
    setDescription(cat.description || '');
    setStatus(cat.status);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name) {
      showToast('Category name is required.', 'error');
      return;
    }

    const payload = { name, description, status };

    try {
      if (selectedCategory) {
        // Edit flow
        const response = await api.put(`/categories/${selectedCategory._id}`, payload);
        if (response.data.success) {
          showToast('Category updated successfully!', 'success');
          fetchCategories();
          setIsModalOpen(false);
        }
      } else {
        // Create flow
        const response = await api.post('/categories', payload);
        if (response.data.success) {
          showToast('Category created successfully!', 'success');
          fetchCategories();
          setIsModalOpen(false);
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error occurred during save.', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCategory) return;
    try {
      const response = await api.delete(`/categories/${selectedCategory._id}`);
      if (response.data.success) {
        showToast('Category deleted successfully!', 'success');
        fetchCategories();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error deleting category.', 'error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans">
      {toastMsg && <Toast message={toastMsg} type={toastType} onClose={handleToastClose} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight font-display">
            Menu Categories
          </h2>
          <p className="text-sm text-gray-500 font-semibold mt-0.5">
            Configure dynamic tags to group and organize menu catalog items
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-xl text-sm font-bold shadow-lg shadow-brand/10 transition-colors cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5" />
            Add Category
          </button>
        )}
      </div>

      {/* Table view */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider text-left">
            <tr>
              <th className="px-6 py-4">Category Name</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4 text-center">Status</th>
              {isAdmin && <th className="px-6 py-4 text-center">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 4 : 3} className="text-center py-10 text-gray-400">
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-1/4 mx-auto"></div>
                    <div className="h-4 bg-gray-100 rounded w-1/3 mx-auto"></div>
                  </div>
                </td>
              </tr>
            ) : categories.length > 0 ? (
              categories.map((cat) => (
                <tr key={cat._id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 font-bold text-gray-900">{cat.name}</td>
                  <td className="px-6 py-4 text-gray-500 font-semibold">{cat.description || 'No description provided'}</td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        cat.status === 'active'
                          ? 'bg-green-100 text-brand'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {cat.status}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(cat)}
                          className="p-1.5 bg-gray-50 hover:bg-brand/10 text-gray-600 hover:text-brand rounded-lg transition-colors"
                          title="Edit Category"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCategory(cat);
                            setIsDeleteOpen(true);
                          }}
                          className="p-1.5 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                          title="Delete Category"
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
                <td colSpan={isAdmin ? 4 : 3} className="text-center py-12 text-gray-400 font-semibold">
                  No categories set up yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedCategory ? 'Edit Category' : 'Create Category'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Category Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pizza, Snacks, Beverages"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of category menu items..."
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
              Save Category
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Category"
        message={`Are you sure you want to permanently delete the category ${selectedCategory?.name}? All products nested under this category will remain, but category tags will be unlinked.`}
        confirmText="Delete Category"
        type="danger"
      />
    </div>
  );
};

export default Categories;
