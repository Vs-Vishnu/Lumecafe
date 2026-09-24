import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { 
  Store, 
  Receipt, 
  Save, 
  Upload, 
  Trash2, 
  Columns, 
  Eye, 
  Image as ImageIcon,
  RotateCcw,
  Sparkles,
  Sliders
} from 'lucide-react';
import Toast from '../components/Toast';
import AIBusinessInsights from '../components/AIBusinessInsights';

const Settings = ({ initialTab }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || initialTab || 'general';
  const activeTab = currentTab === 'ai-insights' ? 'ai-insights' : 'general';

  // Business Profile State
  const [businessName, setBusinessName] = useState('');
  const [logo, setLogo] = useState('');
  const [tagline, setTagline] = useState('Fast. Simple. Accurate.');

  // Billing Customization State
  const [billingImage, setBillingImage] = useState('');
  const [billingGridColumns, setBillingGridColumns] = useState(4);

  // Other configurations
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [currency, setCurrency] = useState('₹');
  const [taxPercentage, setTaxPercentage] = useState('5');
  const [invoicePrefix, setInvoicePrefix] = useState('LB');
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState('1');

  // UI State
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');

  // Keep a copy of original settings to implement "Reset" correctly
  const [originalSettings, setOriginalSettings] = useState(null);

  const handleToastClose = () => setToastMsg(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/settings');
      if (response.data.success && response.data.data) {
        const s = response.data.data;
        setOriginalSettings(s);
        applySettings(s);
      }
    } catch (err) {
      console.error(err);
      setToastMsg('Error loading business settings.');
      setToastType('error');
    } finally {
      setLoading(false);
    }
  };

  const applySettings = (s) => {
    setBusinessName(s.businessName || '');
    setLogo(s.logo || '');
    setTagline(s.tagline || 'Fast. Simple. Accurate.');
    setBillingImage(s.billingImage || '');
    setBillingGridColumns(s.billingGridColumns || 4);
    setAddress(s.address || '');
    setPhone(s.phone || '');
    setEmail(s.email || '');
    setWebsite(s.website || '');
    setGstNumber(s.gstNumber || '');
    setCurrency(s.currency || '₹');
    setTaxPercentage(s.taxPercentage || 5);
    setInvoicePrefix(s.invoicePrefix || 'LB');
    setNextInvoiceNumber(s.nextInvoiceNumber || 1);
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setToastMsg('Invalid image format. Please upload JPG, JPEG, PNG, or WEBP.');
      setToastType('error');
      return;
    }

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setToastMsg('Image size must be 10 MB or less.');
      setToastType('error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'logo') {
        setLogo(reader.result);
      } else if (type === 'billingImage') {
        setBillingImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (type) => {
    if (type === 'logo') {
      setLogo('');
    } else if (type === 'billingImage') {
      setBillingImage('');
    }
  };

  const handleReset = () => {
    if (originalSettings) {
      applySettings(originalSettings);
      setToastMsg('Settings reset to last saved state.');
      setToastType('success');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveLoading(true);

    const payload = {
      businessName,
      logo,
      tagline,
      billingImage,
      billingGridColumns: parseInt(billingGridColumns, 10),
      address,
      phone,
      email,
      website,
      gstNumber,
      currency,
      taxPercentage: parseFloat(taxPercentage),
      invoicePrefix,
      nextInvoiceNumber: parseInt(nextInvoiceNumber, 10),
    };

    try {
      const response = await api.put('/settings', payload);
      if (response.data.success) {
        setToastMsg('Changes saved successfully!');
        setToastType('success');
        setOriginalSettings(response.data.data);
      }
    } catch (err) {
      setToastMsg(err.response?.data?.message || 'Error saving configurations.');
      setToastType('error');
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand"></div>
      </div>
    );
  }

  // Help generate mock items for preview
  const mockProducts = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    name: `Item ${i + 1}`,
    price: (i + 1) * 55
  }));

  // Build responsive column classes for live preview grid
  const getPreviewGridClass = () => {
    switch (Number(billingGridColumns)) {
      case 2: return 'grid-cols-2';
      case 3: return 'grid-cols-3';
      case 4: return 'grid-cols-4';
      case 5: return 'grid-cols-5';
      case 6: return 'grid-cols-6';
      default: return 'grid-cols-4';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans pb-12">
      {toastMsg && <Toast message={toastMsg} type={toastType} onClose={handleToastClose} />}

      {/* Tabs Header */}
      <div className="flex border-b border-gray-200 gap-2">
        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'general' })}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'general'
              ? 'border-brand text-brand font-display'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Sliders className="w-4.5 h-4.5" />
          Business Configurations
        </button>
        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'ai-insights' })}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'ai-insights'
              ? 'border-brand text-brand font-display'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Sparkles className="w-4.5 h-4.5 text-amber-500" />
          🤖 AI Business Insights
        </button>
      </div>

      {activeTab === 'ai-insights' ? (
        <AIBusinessInsights />
      ) : (
        <>
          {/* Header */}
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight font-display">
              Business Configurations
            </h2>
            <p className="text-sm text-gray-500 font-semibold mt-0.5">
              Manage business branding, billing layouts, taxation parameters, and print receipts
            </p>
          </div>


      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Business Profile */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
          <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2 border-b border-gray-50 pb-4">
            <Store className="w-5 h-5 text-brand" />
            Business Profile
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Logo uploader */}
            <div className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-3xl p-4 bg-gray-50/50 space-y-3">
              <span className="text-xs font-bold text-gray-500 block">Shop Logo</span>
              
              {logo ? (
                <div className="relative group w-24 h-24 bg-white border border-gray-100 rounded-2xl flex items-center justify-center p-2 shadow-inner">
                  <img src={logo} alt="Logo Preview" className="max-w-full max-h-full object-contain rounded-lg" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity flex items-center justify-center gap-2">
                    <label className="p-1.5 bg-white text-gray-600 hover:text-brand rounded-lg shadow cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'logo')} />
                    </label>
                    <button 
                      type="button" 
                      onClick={() => removeImage('logo')}
                      className="p-1.5 bg-white text-gray-600 hover:text-red-500 rounded-lg shadow transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <label className="w-24 h-24 bg-white hover:bg-gray-50 border border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm">
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-[10px] font-bold text-gray-400">Upload</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'logo')} />
                </label>
              )}
              <span className="text-[9px] text-gray-400 text-center leading-normal">
                Supported: PNG, JPG, WEBP<br />(Max 10MB)
              </span>
            </div>

            {/* Shop name & tagline */}
            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">Shop Name *</label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. LumeCafe"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">Tagline *</label>
                <input
                  type="text"
                  required
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Fast. Simple. Accurate."
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>
          </div>

          {/* Existing Store profile fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-50">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Phone Number *</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Website</label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Store Address *</label>
              <textarea
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 h-11 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Billing Customization */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
          <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2 border-b border-gray-50 pb-4">
            <Columns className="w-5 h-5 text-brand" />
            Billing Customization
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Options */}
            <div className="space-y-6">
              {/* Billing Image Uploader */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-500">Billing Image / Banner</label>
                
                {billingImage ? (
                  <div className="relative group w-full h-32 bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
                    <img src={billingImage} alt="Billing Banner Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <label className="px-3 py-1.5 bg-white text-gray-700 hover:text-brand rounded-xl text-xs font-bold shadow cursor-pointer transition-colors flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        Replace
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'billingImage')} />
                      </label>
                      <button
                        type="button"
                        onClick={() => removeImage('billingImage')}
                        className="px-3 py-1.5 bg-white text-gray-700 hover:text-red-500 rounded-xl text-xs font-bold shadow transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="w-full h-32 hover:bg-gray-50 border border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm">
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                    <span className="text-xs font-bold text-gray-500">Upload Billing Banner Image</span>
                    <span className="text-[10px] text-gray-400">Supported: PNG, JPG, WEBP (Max 10MB)</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'billingImage')} />
                  </label>
                )}
              </div>

              {/* Grid Column Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-500">Product Grid Columns (Desktop)</label>
                <div className="flex gap-2">
                  {[2, 3, 4, 5, 6].map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setBillingGridColumns(col)}
                      className={`flex-1 py-3 text-sm font-bold border rounded-2xl transition-all cursor-pointer ${
                        Number(billingGridColumns) === col
                          ? 'bg-brand border-brand text-white shadow-md shadow-brand/15'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-brand hover:text-brand'
                      }`}
                    >
                      {col} Cols
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Live Preview */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-brand" />
                Live Preview
              </span>
              <div className="border border-gray-100 rounded-3xl p-4 bg-gray-50 shadow-inner space-y-4">
                {/* Banner inside preview */}
                {billingImage && (
                  <div className="w-full h-16 rounded-2xl overflow-hidden border border-gray-200 shadow-sm flex-shrink-0">
                    <img src={billingImage} alt="Banner Preview" className="w-full h-full object-cover" />
                  </div>
                )}
                
                {/* Branding inside preview */}
                <div className="flex items-center gap-3 border-b border-gray-200 pb-3 bg-white p-3 rounded-2xl shadow-sm">
                  {logo ? (
                    <img src={logo} alt="Mini Logo" className="w-10 h-10 object-contain rounded-lg border border-gray-100" />
                  ) : (
                    <div className="w-10 h-10 bg-brand text-white flex items-center justify-center rounded-lg font-black text-lg">
                      {businessName ? businessName.charAt(0).toUpperCase() : 'L'}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <h4 className="text-xs font-extrabold text-gray-900 truncate leading-tight">
                      {businessName || 'LumeBills'}
                    </h4>
                    <span className="text-[9px] font-bold text-gray-400 block mt-0.5 truncate">
                      {tagline || 'Fast. Simple. Accurate.'}
                    </span>
                  </div>
                </div>

                {/* Grid layout inside preview */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Mock Catalog ({billingGridColumns} Columns)</span>
                  <div className={`grid ${getPreviewGridClass()} gap-2`}>
                    {mockProducts.map(p => (
                      <div key={p.id} className="bg-white border border-gray-150 p-2.5 rounded-xl shadow-sm text-center">
                        <div className="text-[9px] font-bold text-gray-900 truncate leading-snug">{p.name}</div>
                        <div className="text-[9px] font-black text-brand mt-1">{currency}{p.price.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Tax, Currency & Invoice Settings */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
          <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2 border-b border-gray-50 pb-4">
            <Receipt className="w-5 h-5 text-brand" />
            Tax, Currency & Invoice Settings
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Currency Symbol *</label>
              <input
                type="text"
                required
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 text-center font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Default Tax Percentage (%) *</label>
              <input
                type="number"
                required
                value={taxPercentage}
                onChange={(e) => setTaxPercentage(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 text-center font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">GST/Tax Number</label>
              <input
                type="text"
                value={gstNumber}
                placeholder="Optional"
                onChange={(e) => setGstNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Invoice Code Prefix *</label>
              <input
                type="text"
                required
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 text-center font-bold uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Next Invoice Number *</label>
              <input
                type="number"
                required
                value={nextInvoiceNumber}
                onChange={(e) => setNextInvoiceNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 text-center font-bold"
              />
            </div>
          </div>
        </div>

        {/* Submit & Reset actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-5 py-3 border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl text-sm font-bold transition-all cursor-pointer font-sans"
          >
            <RotateCcw className="w-4.5 h-4.5" />
            Reset Defaults
          </button>
          
          <button
            type="submit"
            disabled={saveLoading}
            className="flex items-center gap-2 px-6 py-3 bg-brand hover:bg-brand-dark text-white rounded-xl shadow-lg shadow-brand/10 text-sm font-bold disabled:opacity-50 transition-colors cursor-pointer font-sans"
          >
            <Save className="w-4.5 h-4.5" />
            {saveLoading ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
        </>
      )}
    </div>
  );
};


export default Settings;
