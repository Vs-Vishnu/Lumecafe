import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  UserPlus,
  Receipt,
  User,
  ShoppingBag,
  Info
} from 'lucide-react';
import Toast from '../components/Toast';
import Modal from '../components/Modal';
import Invoice from '../components/Invoice';

const Billing = () => {
  const { user } = useAuth();
  
  // Products and categories state
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Cart state
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [cashReceived, setCashReceived] = useState('');
  const [notes, setNotes] = useState('');
  
  // Customers state
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  
  // Business settings state
  const [settings, setSettings] = useState(null);
  const [currency, setCurrency] = useState('₹');
  const [taxRate, setTaxRate] = useState(5);
  
  // UI state
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  
  // New Customer Form State
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  
  const searchInputRef = useRef(null);

  // Active discounts state
  const [discounts, setDiscounts] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [prodRes, catRes, custRes, settingsRes, discRes] = await Promise.all([
        api.get('/products?status=active&limit=1000'),
        api.get('/categories'),
        api.get('/customers'),
        api.get('/settings'),
        api.get('/discounts/active').catch(() => ({ data: { success: false } })),
      ]);

      if (prodRes.data.success) setProducts(prodRes.data.data);
      if (catRes.data.success) {
        const activeCats = catRes.data.data.filter(c => c.status === 'active');
        setCategories(activeCats);
      }
      if (custRes.data.success) setCustomers(custRes.data.data);
      if (settingsRes.data.success && settingsRes.data.data) {
        const s = settingsRes.data.data;
        setSettings(s);
        setCurrency(s.currency || '₹');
        setTaxRate(s.taxPercentage || 5);
      }
      if (discRes.data?.success) {
        setDiscounts(discRes.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching POS data:', err);
      showToast('Failed to load menu details.', 'error');
    }
  };

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
  };

  // Filter products based on search & category & active status
  const filteredProducts = products.filter(prod => {
    const isActive = prod.status === 'active';

    let matchesCategory = false;
    if (selectedCategory === 'All' || !selectedCategory) {
      matchesCategory = true;
    } else {
      const selectedNorm = selectedCategory.trim().toLowerCase();

      let prodCatName = '';
      let prodCatId = '';

      if (prod.category) {
        if (typeof prod.category === 'object') {
          prodCatName = (prod.category.name || '').trim().toLowerCase();
          prodCatId = (prod.category._id || '').toString();
        } else if (typeof prod.category === 'string') {
          prodCatId = prod.category;
          const matchedCatObj = categories.find(
            c => c._id?.toString() === prod.category || c.name?.trim().toLowerCase() === prod.category.trim().toLowerCase()
          );
          if (matchedCatObj) {
            prodCatName = (matchedCatObj.name || '').trim().toLowerCase();
          } else {
            prodCatName = prod.category.trim().toLowerCase();
          }
        }
      }

      matchesCategory =
        (prodCatName && prodCatName === selectedNorm) ||
        (prodCatId && prodCatId === selectedCategory);
    }

    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      (prod.name && prod.name.toLowerCase().includes(query)) ||
      (prod.SKU && prod.SKU.toLowerCase().includes(query));

    return isActive && matchesCategory && matchesSearch;
  });

  const handleToastClose = () => setToastMsg(null);


  // Check if a discount rule is currently active for a product
  const getProductActiveDiscount = (productId) => {
    if (!discounts || discounts.length === 0) return null;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[now.getDay()];

    const getFormattedDate = (dateVal) => {
      if (!dateVal) return '';
      if (typeof dateVal === 'string') return dateVal.split('T')[0];
      const d = new Date(dateVal);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    for (const d of discounts) {
      const dProdId = typeof d.product === 'object' ? d.product?._id?.toString() : d.product?.toString();
      if (dProdId !== productId.toString() || d.status !== 'active') continue;

      const startStr = getFormattedDate(d.startDate);
      const endStr = getFormattedDate(d.endDate);

      if (todayStr < startStr || todayStr > endStr) continue;

      if (d.applicableDays && d.applicableDays.length > 0) {
        if (!d.applicableDays.includes(currentDay)) continue;
      }

      const [startH, startM] = (d.startTime || '00:00').split(':').map(Number);
      const [endH, endM] = (d.endTime || '23:59').split(':').map(Number);
      const startMinutes = (startH || 0) * 60 + (startM || 0);
      const endMinutes = (endH || 0) * 60 + (endM || 0);

      if (currentMinutes < startMinutes || currentMinutes > endMinutes) continue;

      return d; // Valid active discount rule
    }
    return null;
  };

  // Compute effective selling price and discount info for catalog product
  const getProductEffectivePriceInfo = (product) => {
    const origPrice = product.price;
    const activeDisc = getProductActiveDiscount(product._id);

    if (!activeDisc) {
      return {
        originalPrice: origPrice,
        finalPrice: origPrice,
        discountAmount: 0,
        discountPct: 0,
        discountLabel: null,
        hasDiscount: false,
      };
    }

    let discAmt = 0;
    let discPct = 0;
    let label = '';

    if (activeDisc.discountType === 'Percentage') {
      discPct = activeDisc.discountValue;
      discAmt = Number(((origPrice * discPct) / 100).toFixed(2));
      label = `${discPct}% OFF`;
    } else {
      discAmt = Math.min(origPrice, activeDisc.discountValue);
      discPct = Math.round((discAmt / origPrice) * 100);
      label = `${currency}${discAmt} OFF`;
    }

    const finalPrice = Number(Math.max(0, origPrice - discAmt).toFixed(2));

    return {
      originalPrice: origPrice,
      finalPrice,
      discountAmount: discAmt,
      discountPct: discPct,
      discountLabel: label,
      hasDiscount: true,
    };
  };

  // Compute live price & discount info for a cart item
  const getCartItemPriceInfo = (item) => {
    const product = products.find(p => p._id === item.productId);
    const origPrice = product ? product.price : (item.originalPrice || item.price || 0);
    const activeDisc = getProductActiveDiscount(item.productId);

    if (!activeDisc) {
      return {
        originalPrice: origPrice,
        finalPrice: origPrice,
        discountAmount: 0,
        discountPct: 0,
        hasDiscount: false,
      };
    }

    let discAmt = 0;
    let discPct = 0;

    if (activeDisc.discountType === 'Percentage') {
      discPct = activeDisc.discountValue;
      discAmt = Number(((origPrice * discPct) / 100).toFixed(2));
    } else {
      discAmt = Math.min(origPrice, activeDisc.discountValue);
      discPct = Math.round((discAmt / origPrice) * 100);
    }

    const finalPrice = Number(Math.max(0, origPrice - discAmt).toFixed(2));

    return {
      originalPrice: origPrice,
      finalPrice,
      discountAmount: discAmt,
      discountPct: discPct,
      hasDiscount: true,
    };
  };

  // Automatically sync Discount (₹) field with the SUM of all applicable active product discounts in cart
  useEffect(() => {
    const autoProductDiscountSum = cart.reduce((sum, item) => {
      const info = getCartItemPriceInfo(item);
      return sum + info.discountAmount * item.quantity;
    }, 0);
    setDiscount(Number(autoProductDiscountSum.toFixed(2)));
  }, [cart, discounts, products]);

  // Add item to cart
  const addToCart = (product) => {
    const priceInfo = getProductEffectivePriceInfo(product);
    const existingIndex = cart.findIndex(item => item.productId === product._id);

    if (existingIndex > -1) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, {
        productId: product._id,
        name: product.name,
        originalPrice: priceInfo.originalPrice,
        discountAmount: priceInfo.discountAmount,
        price: priceInfo.finalPrice,
        quantity: 1,
      }]);
    }
    showToast(`${product.name} added to cart`, 'success');
  };

  // Adjust item quantity
  const updateQuantity = (productId, change) => {
    const index = cart.findIndex(item => item.productId === productId);
    if (index === -1) return;

    const newCart = [...cart];
    const newQty = newCart[index].quantity + change;

    if (newQty <= 0) {
      newCart.splice(index, 1);
    } else {
      newCart[index].quantity = newQty;
    }
    setCart(newCart);
  };

  const handleManualQtyChange = (productId, value) => {
    const index = cart.findIndex(item => item.productId === productId);
    if (index === -1) return;

    const newCart = [...cart];
    const parsedQty = parseInt(value, 10);

    if (isNaN(parsedQty) || parsedQty <= 0) {
      newCart.splice(index, 1);
    } else {
      newCart[index].quantity = parsedQty;
    }
    setCart(newCart);
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  // Subtotal = sum of original product price * quantity for all items in cart
  const subtotal = Number(
    cart.reduce((sum, item) => {
      const info = getCartItemPriceInfo(item);
      return sum + info.originalPrice * item.quantity;
    }, 0).toFixed(2)
  );

  // Taxable Amount = Subtotal - Discount
  const taxableAmount = Math.max(0, Number((subtotal - discount).toFixed(2)));

  // Tax = 5% of Taxable Amount
  const tax = Number((taxableAmount * (taxRate / 100)).toFixed(2));

  // Grand Total = Taxable Amount + Tax
  const grandTotal = Number((taxableAmount + tax).toFixed(2));

  // Cash change calculator
  const change = cashReceived ? Number((parseFloat(cashReceived) - grandTotal).toFixed(2)) : 0;

  // Handle customer creation modal submit
  const handleAddCustomerSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/customers', {
        name: newCustomerName,
        phone: newCustomerPhone,
        email: newCustomerEmail,
        address: newCustomerAddress,
      });

      if (response.data.success) {
        showToast('Customer created successfully!', 'success');
        setCustomers([...customers, response.data.data]);
        setSelectedCustomerId(response.data.data._id);
        
        // Reset form
        setNewCustomerName('');
        setNewCustomerPhone('');
        setNewCustomerEmail('');
        setNewCustomerAddress('');
        setIsCustomerModalOpen(false);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error creating customer.', 'error');
    }
  };

  // Submit order checkout
  const handleCheckoutSubmit = async () => {
    if (cart.length === 0) {
      showToast('Cart is empty.', 'error');
      return;
    }

    if (paymentMethod === 'Cash' && (!cashReceived || parseFloat(cashReceived) < grandTotal)) {
      showToast(`Amount received must cover the total bill of ${currency}${grandTotal}.`, 'error');
      return;
    }

    setCheckoutLoading(true);
    try {
      const orderPayload = {
        customerId: selectedCustomerId || null,
        items: cart.map(item => {
          const info = getCartItemPriceInfo(item);
          return {
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            price: info.finalPrice,
            originalPrice: info.originalPrice,
            discountAmount: info.discountAmount,
          };
        }),
        discount,
        paymentMethod,
        notes,
        cashReceived: paymentMethod === 'Cash' ? parseFloat(cashReceived) : grandTotal,
      };

      const response = await api.post('/orders', orderPayload);

      if (response.data.success) {
        showToast('Invoice created successfully!', 'success');
        setCompletedOrder(response.data.data);
        setIsCheckoutModalOpen(true);

        // Reset POS Billing Screen state
        setCart([]);
        setDiscount(0);
        setCashReceived('');
        setSelectedCustomerId('');
        setNotes('');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error placing order.', 'error');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleBrowserPrint = () => {
    // Inject printable root component, trigger window.print
    const printRoot = document.createElement('div');
    printRoot.id = 'printable-receipt-root';
    document.body.appendChild(printRoot);

    // Dynamic render using ReactDOM
    import('react-dom/client').then((ReactDOM) => {
      const root = ReactDOM.createRoot(printRoot);
      root.render(<Invoice order={completedOrder} businessSettings={settings} />);
      
      // Delay printing to allow React DOM compilation
      setTimeout(() => {
        window.print();
        // Remove printable root
        document.body.removeChild(printRoot);
      }, 500);
    });
  };

  const getGridColsClass = () => {
    const cols = settings?.billingGridColumns || 4;
    switch (Number(cols)) {
      case 2:
        return 'grid-cols-2 sm:grid-cols-2 xl:grid-cols-2';
      case 3:
        return 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-3';
      case 4:
        return 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4';
      case 5:
        return 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-5';
      case 6:
        return 'grid-cols-2 sm:grid-cols-4 xl:grid-cols-6';
      default:
        return 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-120px)] overflow-hidden font-sans">
      {toastMsg && <Toast message={toastMsg} type={toastType} onClose={handleToastClose} />}

      {/* Categories & Products Catalogue (LEFT) */}
      <section className="lg:col-span-7 xl:col-span-8 flex flex-col h-full overflow-hidden space-y-4">
        {/* Billing Image Banner */}
        {settings?.billingImage && (
          <div className="w-full h-28 rounded-3xl overflow-hidden border border-gray-100 shadow-sm flex-shrink-0">
            <img src={settings.billingImage} alt="Billing Banner" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Search and category tags */}
        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-4 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              ref={searchInputRef}
              placeholder="Search products by Name, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
            />
          </div>

          {/* Categories tag slider */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                selectedCategory === 'All'
                  ? 'bg-brand border-brand text-white shadow-lg shadow-brand/20'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-brand hover:text-brand'
              }`}
            >
              All Categories
            </button>
            {categories.map(cat => (
              <button
                key={cat._id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                  selectedCategory === cat.name
                    ? 'bg-brand border-brand text-white shadow-lg shadow-brand/20'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-brand hover:text-brand'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid cards */}
        <div className={`flex-grow overflow-y-auto grid ${getGridColsClass()} gap-4 pb-4 pr-1`}>
          {filteredProducts.length > 0 ? (
            filteredProducts.map(prod => {
              const priceInfo = getProductEffectivePriceInfo(prod);
              return (
                <div
                  key={prod._id}
                  onClick={() => addToCart(prod)}
                  className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-0.5 select-none relative"
                >
                  <div className="w-full h-24 bg-gray-50 border border-gray-100 rounded-2xl mb-3 overflow-hidden flex flex-col items-center justify-center text-center p-1.5 flex-shrink-0 select-none relative">
                    {prod.image ? (
                      <img src={prod.image} alt={prod.name} className="w-full h-full object-cover rounded-xl transition-transform hover:scale-105 duration-300" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                    ) : null}
                    <div className="flex flex-col items-center justify-center text-gray-400 space-y-1" style={{ display: prod.image ? 'none' : 'flex' }}>
                      <span className="text-xl">🍽️</span>
                      <span className="text-[8px] font-bold tracking-wider text-gray-400 uppercase">LumeBills</span>
                    </div>
                  </div>
                  <div className="space-y-2 flex-grow">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">
                        {prod.SKU}
                      </span>
                      {prod.category && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-green-50 text-brand border border-green-100">
                          {prod.category.name}
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">
                      {prod.name}
                    </h4>
                  </div>

                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      {priceInfo.hasDiscount ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-400 line-through font-bold">{currency}{priceInfo.originalPrice.toFixed(2)}</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                              🏷️ {priceInfo.discountLabel}
                            </span>
                          </div>
                          <span className="text-base font-black text-emerald-700 font-display block">
                            {currency}{priceInfo.finalPrice.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-base font-black text-gray-900 block">
                          {currency}{prod.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="p-2 bg-brand-light border border-brand/20 text-brand hover:bg-brand hover:text-white rounded-xl transition-all cursor-pointer shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })

          ) : (
            <div className="col-span-full flex flex-col items-center justify-center text-center p-12 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-3">
              <ShoppingBag className="w-12 h-12 text-gray-300" />
              <p className="text-sm font-semibold text-gray-400">No products found matching filters.</p>
            </div>
          )}
        </div>
      </section>

      {/* POS Cart panel (RIGHT) */}
      <section className="lg:col-span-5 xl:col-span-4 bg-white rounded-3xl border border-gray-100 shadow-lg flex flex-col h-full overflow-hidden">
        {/* Customer Select block */}
        <div className="p-4 border-b border-gray-100 flex-shrink-0 flex items-center justify-between gap-2">
          <div className="flex-grow flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-1.5 bg-gray-50">
            <User className="w-4.5 h-4.5 text-gray-400" />
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="bg-transparent border-none w-full text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="">Walk-in Customer</option>
              {customers.map(c => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.phone || 'No Phone'})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setIsCustomerModalOpen(true)}
            className="p-2.5 bg-green-50 hover:bg-brand hover:text-white border border-green-200/50 text-brand rounded-xl transition-colors cursor-pointer"
            title="Create New Customer"
          >
            <UserPlus className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Cart Item logs list */}
        <div className="flex-grow overflow-y-auto p-4 space-y-3">
          {cart.length > 0 ? (
            cart.map(item => (
              <div
                key={item.productId}
                className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100 gap-2"
              >
                <div className="overflow-hidden flex-grow max-w-[55%]">
                  <h5 className="text-xs font-bold text-gray-900 truncate leading-snug">
                    {item.name}
                  </h5>
                  <span className="text-[10px] font-bold text-gray-400">
                    {currency}{item.price.toFixed(2)} each
                  </span>
                </div>

                {/* Qty edit buttons */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => updateQuantity(item.productId, -1)}
                    className="p-1 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-600 transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="text"
                    value={item.quantity}
                    onChange={(e) => handleManualQtyChange(item.productId, e.target.value)}
                    className="w-10 text-center text-xs font-bold bg-white border border-gray-200 rounded-lg py-0.5 focus:outline-none"
                  />
                  <button
                    onClick={() => updateQuantity(item.productId, 1)}
                    className="p-1 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-600 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Total & Action */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-black text-gray-900">
                    {currency}{(item.price * item.quantity).toFixed(2)}
                  </span>
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 space-y-2 py-10">
              <Receipt className="w-10 h-10 text-gray-300" />
              <p className="text-xs font-bold uppercase tracking-wider">Cart is Empty</p>
            </div>
          )}
        </div>

        {/* POS Cart billing summaries (bottom) */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-4 flex-shrink-0">
          <div className="space-y-1.5 text-xs font-medium text-gray-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-bold text-gray-900">{currency}{subtotal.toFixed(2)}</span>
            </div>

            {/* Discount input field - displays sum of all active product discounts */}
            <div className="flex justify-between items-center py-1">
              <span>Discount ({currency})</span>
              <input
                type="number"
                min="0"
                max={subtotal}
                value={discount !== undefined && discount !== null ? discount : ''}
                onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-24 px-2 py-0.5 border border-gray-200 rounded-lg text-right text-xs font-black text-gray-950 focus:outline-none"
              />
            </div>

            <div className="flex justify-between">
              <span>Tax ({taxRate}%)</span>
              <span className="font-bold text-gray-900">{currency}{tax.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between text-base font-black text-gray-900 border-t border-dashed border-gray-200 pt-3">
              <span>Grand Total</span>
              <span>{currency}{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Details Selector */}
          <div className="grid grid-cols-3 gap-2 py-1">
            {['Cash', 'UPI', 'Card'].map(method => (
              <button
                key={method}
                onClick={() => {
                  setPaymentMethod(method);
                  if (method !== 'Cash') setCashReceived('');
                }}
                className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  paymentMethod === method
                    ? 'bg-brand border-brand text-white shadow-md shadow-brand/10'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-brand hover:text-brand'
                }`}
              >
                {method}
              </button>
            ))}
          </div>

          {/* Cash inputs */}
          {paymentMethod === 'Cash' && (
            <div className="space-y-2 border-t border-dotted border-gray-200 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-600">Cash Received</span>
                <input
                  type="number"
                  min={grandTotal}
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder={`Min: ${grandTotal}`}
                  className="w-28 px-3 py-1 border border-gray-200 rounded-lg text-right text-xs font-black text-gray-950 focus:outline-none"
                />
              </div>
              {cashReceived && parseFloat(cashReceived) >= grandTotal && (
                <div className="flex justify-between items-center text-xs font-bold text-brand">
                  <span>Balance Change</span>
                  <span>{currency}{change.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Checkout triggers */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => {
                setCart([]);
                setDiscount(0);
                setCashReceived('');
                setSelectedCustomerId('');
                setNotes('');
              }}
              disabled={cart.length === 0}
              className="py-2.5 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 text-xs font-bold rounded-xl transition-colors cursor-pointer text-center"
            >
              Clear Cart
            </button>
            <button
              onClick={handleCheckoutSubmit}
              disabled={cart.length === 0 || checkoutLoading}
              className="py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-50 text-white shadow-lg shadow-brand/10 text-xs font-bold rounded-xl transition-colors cursor-pointer text-center"
            >
              {checkoutLoading ? 'Processing...' : 'Complete Bill'}
            </button>
          </div>
        </div>
      </section>

      {/* Customer add modal */}
      <Modal isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} title="Add Customer">
        <form onSubmit={handleAddCustomerSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Customer Name *</label>
            <input
              type="text"
              required
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
              placeholder="Full Name"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Phone Number</label>
            <input
              type="tel"
              value={newCustomerPhone}
              onChange={(e) => setNewCustomerPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Email Address</label>
            <input
              type="email"
              value={newCustomerEmail}
              onChange={(e) => setNewCustomerEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Billing Address</label>
            <textarea
              value={newCustomerAddress}
              onChange={(e) => setNewCustomerAddress(e.target.value)}
              placeholder="Full physical address"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 h-20 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsCustomerModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold bg-brand hover:bg-brand-dark text-white rounded-xl shadow-lg shadow-brand/10"
            >
              Save Customer
            </button>
          </div>
        </form>
      </Modal>

      {/* Completed Invoice Print preview Modal */}
      <Modal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        title="Payment Success / Completed Invoice"
        size="sm"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-2.5 p-3.5 bg-green-50 border border-green-200 text-green-800 rounded-2xl">
            <Info className="w-5 h-5 text-brand flex-shrink-0" />
            <div className="text-xs font-bold leading-normal">
              Order saved successfully. You can preview the receipt below and trigger the browser print window.
            </div>
          </div>

          {/* Render receipt inside border box */}
          <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50 overflow-y-auto max-h-72 shadow-inner">
            <Invoice order={completedOrder} businessSettings={settings} />
          </div>

          <div className="flex gap-3 justify-end pt-3 border-t border-gray-100">
            <button
              onClick={() => setIsCheckoutModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl"
            >
              Done
            </button>
            <button
              onClick={handleBrowserPrint}
              className="px-4 py-2 text-xs font-bold bg-brand hover:bg-brand-dark text-white rounded-xl shadow-lg shadow-brand/10 flex items-center gap-1.5"
            >
              Print Receipt
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Billing;
