import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Package, RefreshCw, PlusCircle, MinusCircle, Clipboard, AlertTriangle } from 'lucide-react';
import Toast from '../components/Toast';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';

const Inventory = () => {
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' or 'transactions'
  const [stockList, setStockList] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering & Pagination State
  const [stockSearch, setStockSearch] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [txTotalPages, setTxTotalPages] = useState(1);
  
  // UI triggers state
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currency, setCurrency] = useState('₹');

  // Adjust Form state
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('Purchase'); // Purchase, Adjustment, Sale, Return
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchCurrency();
  }, []);

  useEffect(() => {
    if (activeTab === 'stock') {
      fetchStock();
    } else {
      fetchTransactions();
    }
  }, [activeTab, stockSearch, showLowStockOnly, txPage]);

  const fetchCurrency = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data.success && res.data.data) {
        setCurrency(res.data.data.currency || '₹');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStock = async () => {
    setLoading(true);
    try {
      const response = await api.get('/inventory', {
        params: {
          search: stockSearch,
          lowStock: showLowStockOnly ? 'true' : 'false',
        },
      });
      if (response.data.success) {
        setStockList(response.data.data);
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading stock levels.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/inventory/transactions', {
        params: {
          page: txPage,
          limit: 15,
        },
      });
      if (response.data.success) {
        setTransactions(response.data.data);
        setTxTotalPages(response.data.pagination.pages);
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading ledger history.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
  };

  const handleToastClose = () => setToastMsg(null);

  const handleOpenAdjustModal = (product) => {
    setSelectedProduct(product);
    setAdjustQty('');
    setAdjustType('Purchase');
    setAdjustReason('');
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!adjustQty || parseFloat(adjustQty) === 0) {
      showToast('Please enter a non-zero quantity.', 'error');
      return;
    }

    setAdjustLoading(true);
    try {
      // API adjustment accepts signed values, but let's make it intuitive:
      // If adjustment type is Sale, subtract stock. If Purchase/Adjustment/Return, positive is standard.
      // We will let the user enter positive value, and we format the sign here before sending to API.
      const rawQty = Math.abs(parseFloat(adjustQty));
      const finalQty = (adjustType === 'Sale') ? -rawQty : rawQty;

      const response = await api.post('/inventory/adjust', {
        productId: selectedProduct._id,
        quantity: finalQty,
        type: adjustType,
        reason: adjustReason,
      });

      if (response.data.success) {
        showToast('Stock level updated successfully!', 'success');
        fetchStock();
        setIsAdjustModalOpen(false);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Stock adjustment failed.', 'error');
    } finally {
      setAdjustLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {toastMsg && <Toast message={toastMsg} type={toastType} onClose={handleToastClose} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight font-display">
            Inventory & Stock Control
          </h2>
          <p className="text-sm text-gray-500 font-semibold mt-0.5">
            Monitor product stock, adjust counts, and track stock ledger history
          </p>
        </div>
      </div>

      {/* Tabs list */}
      <div className="border-b border-gray-100 flex gap-4">
        <button
          onClick={() => {
            setActiveTab('stock');
            setLoading(true);
          }}
          className={`pb-3.5 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'stock' ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-gray-950'
          }`}
        >
          Current Stock Levels
        </button>
        <button
          onClick={() => {
            setActiveTab('transactions');
            setLoading(true);
          }}
          className={`pb-3.5 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'transactions' ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-gray-950'
          }`}
        >
          Stock Transaction Ledger
        </button>
      </div>

      {/* Dynamic Tab Body */}
      {activeTab === 'stock' ? (
        <div className="space-y-6">
          {/* Stock Filters */}
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:max-w-md">
              <Clipboard className="absolute left-3.5 top-3 w-4.5 h-4.5 text-gray-400" />
              <input
                type="text"
                placeholder="Filter stock by name..."
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            
            <label className="flex items-center gap-2 text-xs font-bold text-gray-600 bg-gray-50 border border-gray-100 px-4 py-2.5 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={showLowStockOnly}
                onChange={(e) => setShowLowStockOnly(e.target.checked)}
                className="h-4 w-4 text-brand focus:ring-brand rounded border-gray-300"
              />
              <span>Show Low Stock Items Only</span>
            </label>
          </div>

          {/* Current Stock Levels Table */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider text-left">
                  <tr>
                    <th className="px-6 py-4">SKU</th>
                    <th className="px-6 py-4">Item Name</th>
                    <th className="px-6 py-4 text-center">Category</th>
                    <th className="px-6 py-4 text-center">Stock Level</th>
                    <th className="px-6 py-4 text-center">Min Alert Level</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    {isAdmin && <th className="px-6 py-4 text-center">Stock Adjustment</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6} className="text-center py-10 text-gray-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto"></div>
                      </td>
                    </tr>
                  ) : stockList.length > 0 ? (
                    stockList.map(item => (
                      <tr key={item._id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4 font-bold text-gray-900">{item.SKU}</td>
                        <td className="px-6 py-4 text-gray-900 font-bold">{item.name}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2.5 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs font-bold">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              item.isLowStock
                                ? 'bg-red-50 text-red-600 border border-red-100 animate-pulse'
                                : 'bg-green-50 text-brand border border-green-100'
                            }`}
                          >
                            {item.stockQuantity} {item.unit}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-gray-500 font-semibold">
                          {item.minStockLevel} {item.unit}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {item.isLowStock ? (
                            <span className="inline-flex items-center gap-1 text-xs text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-brand font-bold bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                              Normal
                            </span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4">
                            <div className="flex justify-center">
                              <button
                                onClick={() => handleOpenAdjustModal(item)}
                                className="flex items-center gap-1 px-3.5 py-1.5 border border-brand/20 bg-brand-light hover:bg-brand hover:text-white text-brand rounded-xl text-xs font-bold transition-all cursor-pointer"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Adjust Stock
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6} className="text-center py-12 text-gray-400 font-semibold">
                        No product inventories found matching filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stock transaction history list */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider text-left">
                  <tr>
                    <th className="px-6 py-4">Date / Time</th>
                    <th className="px-6 py-4">SKU</th>
                    <th className="px-6 py-4">Product Name</th>
                    <th className="px-6 py-4 text-center">Type</th>
                    <th className="px-6 py-4 text-center">Change Qty</th>
                    <th className="px-6 py-4 text-center">Prev Stock</th>
                    <th className="px-6 py-4 text-center">New Stock</th>
                    <th className="px-6 py-4">Reason / Reference</th>
                    <th className="px-6 py-4">Logged By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-gray-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto"></div>
                      </td>
                    </tr>
                  ) : transactions.length > 0 ? (
                    transactions.map(tx => {
                      const dt = new Date(tx.date || tx.createdAt);
                      const isQtyPositive = tx.quantity > 0;
                      const badgeStyles = {
                        Sale: 'bg-red-50 text-red-600 border border-red-100',
                        Purchase: 'bg-green-50 text-brand border border-green-100',
                        Adjustment: 'bg-amber-50 text-amber-600 border border-amber-100',
                        Return: 'bg-blue-50 text-blue-600 border border-blue-100',
                      };

                      return (
                        <tr key={tx._id} className="hover:bg-gray-50/50">
                          <td className="px-6 py-4 text-xs font-semibold text-gray-500 whitespace-nowrap">
                            {dt.toLocaleDateString('en-IN')} {dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap">
                            {tx.product?.SKU || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-gray-900 font-bold whitespace-nowrap">
                            {tx.product?.name || 'Deleted Product'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${badgeStyles[tx.type]}`}>
                              {tx.type}
                            </span>
                          </td>
                          <td className={`px-6 py-4 text-center font-bold ${isQtyPositive ? 'text-green-600' : 'text-red-500'}`}>
                            {isQtyPositive ? `+${tx.quantity}` : tx.quantity}
                          </td>
                          <td className="px-6 py-4 text-center text-gray-500">{tx.previousStock}</td>
                          <td className="px-6 py-4 text-center text-gray-900 font-bold">{tx.newStock}</td>
                          <td className="px-6 py-4 text-gray-500 font-semibold">{tx.reason || 'N/A'}</td>
                          <td className="px-6 py-4 text-gray-500 capitalize">{tx.userName || 'N/A'}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-gray-400 font-semibold">
                        No transactions registered in the history log.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {txTotalPages > 1 && (
              <div className="bg-gray-50 border-t border-gray-100 px-6 py-4 flex items-center justify-between">
                <span className="text-xs text-gray-500 font-semibold">
                  Page {txPage} of {txTotalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTxPage(Math.max(1, txPage - 1))}
                    disabled={txPage === 1}
                    className="px-3.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setTxPage(Math.min(txTotalPages, txPage + 1))}
                    disabled={txPage === txTotalPages}
                    className="px-3.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal Form */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title={`Stock Adjustment: ${selectedProduct?.name}`}
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          <div className="p-3.5 bg-green-50 border border-green-200 text-green-800 rounded-2xl flex items-center gap-2">
            <Package className="w-5 h-5 text-brand flex-shrink-0" />
            <div className="text-xs font-semibold">
              Current Stock Quantity: <strong className="text-sm font-black">{selectedProduct?.stockQuantity} {selectedProduct?.unit}</strong>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Adjustment Type *</label>
            <select
              value={adjustType}
              onChange={(e) => setAdjustType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              <option value="Purchase">Purchase (Stock In +)</option>
              <option value="Adjustment">Adjustment (Inventory Count Audit +/-)</option>
              <option value="Sale">Sale (Stock Out -)</option>
              <option value="Return">Return (Customer Return +)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Quantity *</label>
            <input
              type="number"
              min="1"
              required
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
              placeholder="Enter stock quantity count change"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Reason / Note *</label>
            <textarea
              required
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="e.g. Received new shipment, monthly stock audit count update"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 h-20 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsAdjustModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={adjustLoading}
              className="px-4 py-2 text-xs font-bold bg-brand hover:bg-brand-dark text-white rounded-xl shadow-lg shadow-brand/10 disabled:opacity-50"
            >
              {adjustLoading ? 'Saving...' : 'Apply Stock Adjustment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Inventory;
