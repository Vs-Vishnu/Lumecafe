import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ShoppingBag,
  Plus,
  Minus,
  Search,
  MapPin,
  Check,
  CreditCard,
  Banknote,
  Smartphone,
  ArrowRight,
  Clock,
  Sparkles
} from 'lucide-react';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import CustomerAddressForm from '../components/CustomerAddressForm';

const CustomerMenu = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Cart state: { [productId]: { product, quantity } }
  const [cart, setCart] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Address and payment state
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [isEnteringNewAddress, setIsEnteringNewAddress] = useState(false);
  const [manualAddressData, setManualAddressData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [orderNotes, setOrderNotes] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);

  const [settings, setSettings] = useState(null);
  const [currency, setCurrency] = useState('₹');

  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes, settingsRes] = await Promise.all([
        api.get('/products'),
        api.get('/categories'),
        api.get('/settings'),
      ]);

      if (prodRes.data.success) {
        setProducts(prodRes.data.data.filter((p) => p.status === 'active'));
      }
      if (catRes.data.success) {
        setCategories(catRes.data.data.filter((c) => c.status === 'active'));
      }
      if (settingsRes.data.success && settingsRes.data.data) {
        setSettings(settingsRes.data.data);
        setCurrency(settingsRes.data.data.currency || '₹');
      }

      // If customer is logged in, fetch saved addresses
      if (user && user.role === 'customer') {
        fetchCustomerAddresses();
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load menu details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerAddresses = async () => {
    try {
      const res = await api.get('/customer/addresses');
      if (res.data.success) {
        setSavedAddresses(res.data.data);
        const defaultAddr = res.data.data.find((a) => a.isDefault) || res.data.data[0];
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr._id);
        }
      }
    } catch (err) {
      console.warn('Could not load saved addresses:', err.message);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
  };

  // Cart operations
  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev[product._id];
      const newQty = existing ? existing.quantity + 1 : 1;
      return {
        ...prev,
        [product._id]: { product, quantity: newQty },
      };
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart((prev) => {
      const existing = prev[productId];
      if (!existing) return prev;
      const newQty = existing.quantity + delta;
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return {
        ...prev,
        [productId]: { ...existing, quantity: newQty },
      };
    });
  };

  const cartItemsList = Object.values(cart);
  const totalItemCount = cartItemsList.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItemsList.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const taxRate = settings ? settings.taxPercentage || 5 : 5;
  const tax = Number((subtotal * (taxRate / 100)).toFixed(2));
  const grandTotal = Number((subtotal + tax).toFixed(2));

  // Filter products
  const filteredProducts = products.filter((prod) => {
    let matchesCategory = false;
    if (selectedCategory === 'All') {
      matchesCategory = true;
    } else {
      const catName = prod.category?.name || prod.category;
      matchesCategory = catName === selectedCategory;
    }
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || prod.name.toLowerCase().includes(query) || (prod.description && prod.description.toLowerCase().includes(query));
    return matchesCategory && matchesSearch;
  });

  const handleOpenCheckout = () => {
    if (!user) {
      showToast('Please sign in or create an account to place your delivery order.', 'error');
      navigate('/login?mode=register');
      return;
    }
    if (cartItemsList.length === 0) {
      showToast('Your cart is empty. Add delicious items to continue!', 'error');
      return;
    }
    setIsCheckoutOpen(true);
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId && !manualAddressData) {
      showToast('Please select or provide a manual delivery address.', 'error');
      return;
    }

    setPlacingOrder(true);
    try {
      const payload = {
        items: cartItemsList.map((item) => ({
          productId: item.product._id,
          name: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
        })),
        paymentMethod,
        notes: orderNotes,
      };

      if (selectedAddressId && !isEnteringNewAddress) {
        payload.addressId = selectedAddressId;
      } else if (manualAddressData) {
        payload.manualAddress = manualAddressData;
      }

      const response = await api.post('/customer/orders', payload);
      if (response.data.success) {
        showToast('Order placed successfully! Redirecting to live tracking...');
        setCart({});
        setIsCheckoutOpen(false);
        const orderId = response.data.data._id;
        setTimeout(() => {
          navigate(`/track-order/${orderId}`);
        }, 1200);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to place order. Please check address details.', 'error');
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans pb-24">
      {toastMsg && <Toast message={toastMsg} type={toastType} onClose={() => setToastMsg(null)} />}

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-700 via-brand to-emerald-500 text-white p-6 sm:p-8 shadow-xl shadow-brand/10">
        <div className="relative z-10 max-w-xl space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black uppercase tracking-wider text-white">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Fast Delivery to Your Doorstep
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold font-display tracking-tight leading-tight">
            Order Fresh Meals & Juices
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100 font-medium leading-relaxed">
            Crafted with fresh ingredients. Enter your delivery address manually for verified doorstep delivery.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search pizza, juice, coffee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>

        {/* Categories Pills */}
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === 'All'
                ? 'bg-brand text-white shadow-md shadow-brand/20'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            All Menu
          </button>
          {categories.map((cat) => (
            <button
              key={cat._id}
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat.name
                  ? 'bg-brand text-white shadow-md shadow-brand/20'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto"></div>
          </div>
        ) : filteredProducts.length > 0 ? (
          filteredProducts.map((prod) => {
            const inCart = cart[prod._id];
            return (
              <div
                key={prod._id}
                className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-extrabold text-gray-900 text-sm leading-snug">{prod.name}</h3>
                    <span className="font-black text-brand text-base whitespace-nowrap">
                      {currency}{prod.price.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium line-clamp-2 mb-4 leading-relaxed">
                    {prod.description || 'Freshly made with authentic culinary recipes.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">
                    {prod.category?.name || 'Item'}
                  </span>

                  {inCart ? (
                    <div className="flex items-center gap-2 bg-emerald-50 rounded-xl p-1 border border-brand/20">
                      <button
                        onClick={() => updateQuantity(prod._id, -1)}
                        className="w-6 h-6 rounded-lg bg-white text-gray-700 flex items-center justify-center font-bold hover:bg-gray-100 transition-colors shadow-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-extrabold text-xs text-brand px-1">{inCart.quantity}</span>
                      <button
                        onClick={() => updateQuantity(prod._id, 1)}
                        className="w-6 h-6 rounded-lg bg-brand text-white flex items-center justify-center font-bold hover:bg-brand-dark transition-colors shadow-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(prod)}
                      className="px-3.5 py-1.5 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-bold shadow-md shadow-brand/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-16 text-center text-gray-400 font-semibold">
            No items matched your filter or search query.
          </div>
        )}
      </div>

      {/* Floating Bottom Cart Bar */}
      {totalItemCount > 0 && (
        <div className="fixed bottom-6 left-0 right-0 z-30 px-4">
          <div className="max-w-2xl mx-auto bg-gray-900 text-white rounded-3xl p-4 shadow-2xl flex items-center justify-between border border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand flex items-center justify-center font-black text-white text-sm">
                {totalItemCount}
              </div>
              <div>
                <span className="text-xs text-gray-400 block font-semibold">Your Delivery Cart</span>
                <span className="text-base font-black text-white">{currency}{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleOpenCheckout}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-2xl text-xs font-bold shadow-lg shadow-brand/20 transition-all cursor-pointer"
            >
              <span>Review & Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      <Modal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        title="Delivery Order Checkout"
        size="md"
      >
        <div className="space-y-5 font-sans">
          {/* Order items summary */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Order Items ({totalItemCount})</h4>
            <div className="border border-gray-100 rounded-2xl p-3 bg-gray-50/70 max-h-36 overflow-y-auto space-y-1.5">
              {cartItemsList.map((item) => (
                <div key={item.product._id} className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-800">
                    {item.quantity}x {item.product.name}
                  </span>
                  <span className="font-semibold text-gray-600">
                    {currency}{(item.product.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Address Selection */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Delivery Address *</h4>
              <button
                type="button"
                onClick={() => setIsEnteringNewAddress(!isEnteringNewAddress)}
                className="text-xs font-bold text-brand hover:underline"
              >
                {isEnteringNewAddress ? 'Select from saved addresses' : '+ Enter new address'}
              </button>
            </div>

            {isEnteringNewAddress ? (
              <div className="border border-gray-200 rounded-2xl p-4 bg-white">
                <CustomerAddressForm
                  onSubmit={(data) => {
                    setManualAddressData(data);
                    showToast('Address details captured for this delivery order!');
                  }}
                  onCancel={() => setIsEnteringNewAddress(false)}
                />
              </div>
            ) : savedAddresses.length > 0 ? (
              <div className="space-y-2">
                {savedAddresses.map((addr) => (
                  <label
                    key={addr._id}
                    className={`block p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      selectedAddressId === addr._id
                        ? 'border-brand bg-emerald-50/50 ring-1 ring-brand'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="radio"
                        name="delivery_address"
                        value={addr._id}
                        checked={selectedAddressId === addr._id}
                        onChange={() => {
                          setSelectedAddressId(addr._id);
                          setManualAddressData(null);
                        }}
                        className="mt-0.5 text-brand focus:ring-brand"
                      />
                      <div className="text-xs leading-tight">
                        <span className="font-bold text-gray-900 block">{addr.fullName} • {addr.phone}</span>
                        <span className="text-gray-600 mt-0.5 block">{addr.houseNumber}, {addr.streetName}, {addr.area}, {addr.city} - {addr.postalCode}</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-center p-4 border border-dashed border-gray-200 rounded-2xl">
                <p className="text-xs text-gray-500 mb-2">No saved addresses found.</p>
                <button
                  type="button"
                  onClick={() => setIsEnteringNewAddress(true)}
                  className="px-3.5 py-1.5 bg-brand text-white rounded-xl text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Enter Manual Delivery Address</span>
                </button>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Payment Option</h4>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Cash', label: 'Cash on Delivery', icon: <Banknote className="w-4 h-4" /> },
                { id: 'UPI', label: 'UPI / QR', icon: <Smartphone className="w-4 h-4" /> },
                { id: 'Card', label: 'Card on Delivery', icon: <CreditCard className="w-4 h-4" /> },
              ].map((pm) => (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => setPaymentMethod(pm.id)}
                  className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === pm.id
                      ? 'border-brand bg-emerald-50 text-brand font-bold ring-1 ring-brand'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {pm.icon}
                  <span className="text-[11px] font-semibold">{pm.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Order Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Kitchen / Delivery Notes</label>
            <input
              type="text"
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="e.g. Less spicy, leave at door"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          {/* Totals Breakdown */}
          <div className="border-t border-gray-100 pt-3 space-y-1 text-xs font-semibold text-gray-600">
            <div className="flex justify-between">
              <span>Items Subtotal</span>
              <span className="text-gray-900">{currency}{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Taxes ({taxRate}%)</span>
              <span className="text-gray-900">{currency}{tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t border-dashed border-gray-200">
              <span>Grand Total</span>
              <span className="text-brand">{currency}{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              onClick={handlePlaceOrder}
              disabled={placingOrder}
              className="w-full py-3 px-4 bg-brand hover:bg-brand-dark text-white rounded-xl text-sm font-bold shadow-lg shadow-brand/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <span>{placingOrder ? 'Confirming Order...' : `Place Delivery Order (${currency}${grandTotal.toFixed(2)})`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CustomerMenu;
