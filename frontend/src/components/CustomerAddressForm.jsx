import React, { useState, useEffect } from 'react';
import { MapPin, Phone, User, Home, Building2, Navigation } from 'lucide-react';

const CustomerAddressForm = ({ initialData = null, onSubmit, onCancel, submitting = false }) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [streetName, setStreetName] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [landmark, setLandmark] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFullName(initialData.fullName || '');
      setPhone(initialData.phone || '');
      setHouseNumber(initialData.houseNumber || '');
      setStreetName(initialData.streetName || '');
      setArea(initialData.area || '');
      setCity(initialData.city || '');
      setDistrict(initialData.district || '');
      setState(initialData.state || '');
      setPostalCode(initialData.postalCode || '');
      setLandmark(initialData.landmark || '');
      setDeliveryInstructions(initialData.deliveryInstructions || '');
      setIsDefault(Boolean(initialData.isDefault));
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!fullName || !phone || !houseNumber || !streetName || !area || !city || !state || !postalCode) {
      setError('Please fill in all required address fields marked with *');
      return;
    }

    const cleanedPostal = postalCode.trim();
    if (!/^\d{5,6}$/.test(cleanedPostal)) {
      setError('Please enter a valid 5 or 6 digit postal / PIN code.');
      return;
    }

    onSubmit({
      fullName: fullName.trim(),
      phone: phone.trim(),
      houseNumber: houseNumber.trim(),
      streetName: streetName.trim(),
      area: area.trim(),
      city: city.trim(),
      district: district.trim(),
      state: state.trim(),
      postalCode: cleanedPostal,
      landmark: landmark.trim(),
      deliveryInstructions: deliveryInstructions.trim(),
      isDefault,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 font-sans text-left">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">
          {error}
        </div>
      )}

      {/* Notice regarding manual address entry */}
      <div className="p-3 bg-emerald-50/80 border border-emerald-100 rounded-xl text-xs text-emerald-900 font-medium flex items-start gap-2">
        <Navigation className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" />
        <span>
          Enter your precise delivery address manually below. Our delivery partners will use this exact address for doorstep navigation.
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Full Name *</label>
          <div className="relative rounded-xl">
            <User className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Jane Sharma"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number *</label>
          <div className="relative rounded-xl">
            <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Flat / House / Building No. *</label>
          <div className="relative rounded-xl">
            <Home className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              required
              value={houseNumber}
              onChange={(e) => setHouseNumber(e.target.value)}
              placeholder="e.g. Flat 302, Palm Heights"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Street / Road Name *</label>
          <div className="relative rounded-xl">
            <Building2 className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              required
              value={streetName}
              onChange={(e) => setStreetName(e.target.value)}
              placeholder="e.g. 4th Cross Road"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Area / Locality *</label>
          <input
            type="text"
            required
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="e.g. Indiranagar"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Landmark (Optional)</label>
          <input
            type="text"
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
            placeholder="e.g. Behind Metro Station"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">City *</label>
          <input
            type="text"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Bengaluru"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">State *</label>
          <input
            type="text"
            required
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="e.g. Karnataka"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Postal Code *</label>
          <input
            type="text"
            required
            maxLength={6}
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="e.g. 560038"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">Delivery Instructions (Optional)</label>
        <textarea
          rows={2}
          value={deliveryInstructions}
          onChange={(e) => setDeliveryInstructions(e.target.value)}
          placeholder="e.g. Please leave at front door, gate code #4421"
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox"
          id="isDefault"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="w-4 h-4 text-brand rounded border-gray-300 focus:ring-brand"
        />
        <label htmlFor="isDefault" className="text-xs font-semibold text-gray-700 cursor-pointer">
          Set as my default delivery address
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2 text-xs font-bold bg-brand hover:bg-brand-dark text-white rounded-xl shadow-lg shadow-brand/10 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {submitting ? 'Saving Address...' : 'Save Delivery Address'}
        </button>
      </div>
    </form>
  );
};

export default CustomerAddressForm;
