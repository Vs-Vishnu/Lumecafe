import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Edit2, Trash2, Search, Filter, Upload, Image as ImageIcon } from 'lucide-react';
import Toast from '../components/Toast';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';

const Products = () => {
  const { user } = useAuth();
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Query Filters State
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  
  // UI Triggers State
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Form Fields State
  const [name, setName] = useState('');
  const [SKU, setSKU] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [taxPercentage, setTaxPercentage] = useState('5');
  const [unit, setUnit] = useState('pcs');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');
  const [image, setImage] = useState('');

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [search, categoryFilter, statusFilter, pagination.page]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/products', {
        params: {
          search,
          category: categoryFilter,
          status: statusFilter,
          page: pagination.page,
          limit: 15,
        },
      });

      if (response.data.success) {
        setProducts(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading products list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      if (response.data.success) {
        setCategories(response.data.data.filter(c => c.status === 'active'));
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
  };

  const handleToastClose = () => setToastMsg(null);

  const resetForm = () => {
    setSelectedProduct(null);
    setName('');
    setSKU('');
    setCategoryId('');
    setPrice('');
    setCostPrice('');
    setTaxPercentage('5');
    setUnit('pcs');
    setDescription('');
    setStatus('active');
    setImage('');
  };

  const handleOpenCreateModal = () => {
    resetForm();
    if (categories.length > 0) setCategoryId(categories[0]._id);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product) => {
    setSelectedProduct(product);
    setName(product.name);
    setSKU(product.SKU);
    setCategoryId(product.category?._id || '');
    setPrice(product.price);
    setCostPrice(product.costPrice);
    setTaxPercentage(product.taxPercentage);
    setUnit(product.unit || 'pcs');
    setDescription(product.description || '');
    setStatus(product.status);
    setImage(product.image || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (parseFloat(price) < 0 || parseFloat(costPrice) < 0) {
      showToast('Values cannot be negative.', 'error');
      return;
    }

    const payload = {
      name,
      SKU,
      category: categoryId,
      price: parseFloat(price),
      costPrice: parseFloat(costPrice),
      taxPercentage: parseFloat(taxPercentage),
      unit,
      description,
      status,
      image,
    };

    try {
      if (selectedProduct) {
        // Edit flow
        const response = await api.put(`/products/${selectedProduct._id}`, payload);
        if (response.data.success) {
          showToast('Product updated successfully!', 'success');
          fetchProducts();
          setIsModalOpen(false);
        }
      } else {
        // Create flow
        const response = await api.post('/products', payload);
        if (response.data.success) {
          showToast('Product created successfully!', 'success');
          fetchProducts();
          setIsModalOpen(false);
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error occurred during save.', 'error');
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Please upload a JPG, JPEG, PNG, or WEBP image.', 'error');
      return;
    }

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      showToast('Image size must be 10 MB or less.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;
    try {
      const response = await api.delete(`/products/${selectedProduct._id}`);
      if (response.data.success) {
        showToast('Product deleted successfully');
        fetchProducts();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error deleting product.', 'error');
    } finally {
      setIsDeleteOpen(false);
      setSelectedProduct(null);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {toastMsg && <Toast message={toastMsg} type={toastType} onClose={handleToastClose} />}

      {/* Delete product confirmation dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteProduct}
        title="Delete Product"
        message={`Are you sure you want to delete "${selectedProduct?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        type="danger"
      />

      {/* Header controls bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight font-display">
            Product Directory
          </h2>
          <p className="text-sm text-gray-500 font-semibold mt-0.5">
            Manage menu items, prices, category tags, and billing availability
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-xl shadow-lg shadow-brand/10 font-bold text-sm transition-all duration-200 cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5" />
            Add Product
          </button>
        )}
      </div>

      {/* Search & filters row */}
      <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-3">
        {/* Search input */}
        <div className="relative flex-grow w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination({ ...pagination, page: 1 });
            }}
            placeholder="Search by product name or SKU..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
          />
        </div>

        {/* Category filter dropdown */}
        <div className="w-full md:w-48">
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPagination({ ...pagination, page: 1 });
            }}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat._id} value={cat._id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Status filter dropdown */}
        <div className="w-full md:w-36">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination({ ...pagination, page: 1 });
            }}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table view */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider text-left">
              <tr>
                <th className="px-6 py-4">SKU</th>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-right">Price</th>
                <th className="px-6 py-4 text-right">Cost</th>
                <th className="px-6 py-4 text-center">Tax %</th>
                <th className="px-6 py-4 text-center">Status</th>
                {isAdmin && <th className="px-6 py-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="text-center py-10 text-gray-400">
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-gray-100 rounded w-1/4 mx-auto"></div>
                      <div className="h-4 bg-gray-100 rounded w-1/3 mx-auto"></div>
                    </div>
                  </td>
                </tr>
              ) : products.length > 0 ? (
                products.map((prod) => {
                  return (
                    <tr key={prod._id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-bold text-gray-900">{prod.SKU}</td>
                      <td className="px-6 py-4 text-gray-900 font-bold">
                        <div className="flex items-center gap-3">
                          {prod.image ? (
                            <img src={prod.image} alt={prod.name} className="w-8 h-8 rounded-lg object-contain bg-gray-50 border border-gray-100 flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-sm flex-shrink-0">
                              🍽️
                            </div>
                          )}
                          <span className="truncate">{prod.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">
                          {prod.category?.name || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">
                        ₹{prod.price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-500 font-semibold">
                        ₹{prod.costPrice.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-500 font-semibold">
                        {prod.taxPercentage}%
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            prod.status === 'active'
                              ? 'bg-green-100 text-brand'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {prod.status}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleOpenEditModal(prod)}
                              className="p-1.5 bg-gray-50 hover:bg-brand/10 text-gray-600 hover:text-brand rounded-lg transition-colors"
                              title="Edit Product"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedProduct(prod);
                                setIsDeleteOpen(true);
                              }}
                              className="p-1.5 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                              title="Delete Product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="text-center py-12 text-gray-400 font-semibold">
                    No products found in this directory.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination logs footer */}
        {pagination.pages > 1 && (
          <div className="bg-gray-50 border-t border-gray-100 px-6 py-4 flex items-center justify-between">
            <span className="text-xs text-gray-500 font-semibold">
              Showing Page {pagination.page} of {pagination.pages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination({ ...pagination, page: Math.max(1, pagination.page - 1) })}
                disabled={pagination.page === 1}
                className="px-3.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: Math.min(pagination.pages, pagination.page + 1) })}
                disabled={pagination.page === pagination.pages}
                className="px-3.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit product modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedProduct ? 'Edit Product' : 'Add Product'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Product Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Margherita Pizza"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">SKU Code *</label>
              <input
                type="text"
                required
                value={SKU}
                onChange={(e) => setSKU(e.target.value)}
                placeholder="PIZ001"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Category *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                {categories.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Unit of Measure *</label>
              <input
                type="text"
                required
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. pcs, cup, plate, kg"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Selling Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="180.00"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Cost Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="100.00"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Tax Percentage (%)</label>
              <input
                type="number"
                required
                value={taxPercentage}
                onChange={(e) => setTaxPercentage(e.target.value)}
                placeholder="5"
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

            {/* Description textarea */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional item details..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 h-16 resize-none"
              />
            </div>

            {/* Product Image Uploader */}
            <div className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-2xl p-3 bg-gray-50/50 space-y-2 col-span-1 md:col-span-2">
              <span className="text-xs font-bold text-gray-500 block">Product Image</span>
              <div className="flex items-center gap-4">
                {image ? (
                  <div className="relative group w-20 h-20 bg-white border border-gray-150 rounded-xl flex items-center justify-center p-1.5 shadow-inner">
                    <img src={image} alt="Product Preview" className="max-w-full max-h-full object-contain rounded-lg" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity flex items-center justify-center gap-1.5">
                      <label className="p-1 bg-white text-gray-600 hover:text-brand rounded-md shadow cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                      </label>
                      <button
                        type="button"
                        onClick={() => setImage('')}
                        className="p-1 bg-white text-gray-600 hover:text-red-500 rounded-md shadow transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="w-20 h-20 bg-white hover:bg-gray-50 border border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors shadow-sm">
                    <ImageIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-[9px] font-bold text-gray-400">Upload</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                )}
                <span className="text-[10px] text-gray-400 max-w-[180px] leading-tight">
                  PNG, JPG, WEBP (Max 10MB). Image displays on billing tiles.
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-bold shadow-md shadow-brand/10 transition-colors"
            >
              {selectedProduct ? 'Update Product' : 'Save Product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Products;
