import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import {
  Navigation,
  ExternalLink,
  MapPin,
  Clock,
  Compass,
  AlertCircle,
  Bike,
  Home,
  CheckCircle2,
  X
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon path issues in Vite bundles
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const RouteNavigationModal = ({ isOpen, onClose, destinationAddress, orderNumber }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const polylineLayerRef = useRef(null);
  const markersLayerRef = useRef([]);

  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [partnerCoords, setPartnerCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [routeMode, setRouteMode] = useState('fastest');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      initNavigation();
    } else {
      cleanupMap();
    }

    return () => cleanupMap();
  }, [isOpen, destinationAddress, routeMode]);

  const cleanupMap = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
  };

  const initNavigation = async () => {
    setLoading(true);
    setErrorMsg('');
    setPermissionDenied(false);

    try {
      // 1. Geocode Destination Address if coordinates not present
      let resolvedDest = destinationAddress?.coordinates;
      if (!resolvedDest?.latitude || !resolvedDest?.longitude) {
        const geoRes = await api.post('/maps/geocode', { address: destinationAddress });
        if (geoRes.data.success && geoRes.data.data.latitude) {
          resolvedDest = {
            latitude: geoRes.data.data.latitude,
            longitude: geoRes.data.data.longitude,
          };
        } else {
          // If geocoding fails, fallback to standard city coordinates (e.g. 12.9716, 77.5946)
          resolvedDest = { latitude: 12.9716, longitude: 77.5946 };
        }
      }
      setDestCoords(resolvedDest);

      // 2. Request delivery partner device GPS location with browser permissions
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by your browser.');
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const origin = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setPartnerCoords(origin);

          // 3. Fetch Route Navigation from Map Service
          await fetchRoute(origin, resolvedDest);
        },
        async (geoError) => {
          console.warn('Geolocation permission not granted or timeout:', geoError.message);
          setPermissionDenied(true);
          // Fallback partner origin near destination for demonstration
          const fallbackOrigin = {
            latitude: resolvedDest.latitude - 0.02,
            longitude: resolvedDest.longitude - 0.02,
          };
          setPartnerCoords(fallbackOrigin);
          await fetchRoute(fallbackOrigin, resolvedDest);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } catch (err) {
      setErrorMsg(err.message || 'Error initializing route navigation.');
      setLoading(false);
    }
  };

  const fetchRoute = async (origin, dest) => {
    try {
      const res = await api.post('/maps/route', {
        origin,
        destination: dest,
        mode: routeMode,
      });

      if (res.data.success) {
        const data = res.data.data;
        setRouteData(data);
        renderMap(origin, dest, data);
      }
    } catch (err) {
      console.error('Route error:', err);
      setErrorMsg('Failed to calculate live driving route.');
    } finally {
      setLoading(false);
    }
  };

  const renderMap = (origin, dest, route) => {
    if (!mapContainerRef.current) return;
    cleanupMap();

    // Create Leaflet Map
    const map = L.map(mapContainerRef.current).setView([origin.latitude, origin.longitude], 13);
    mapInstanceRef.current = map;

    // Add OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Create Custom Markers
    const partnerIcon = L.divIcon({
      className: 'custom-partner-marker',
      html: `
        <div style="background: #10B981; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2px solid white;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    const destIcon = L.divIcon({
      className: 'custom-dest-marker',
      html: `
        <div style="background: #EF4444; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2px solid white;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    const partnerMarker = L.marker([origin.latitude, origin.longitude], { icon: partnerIcon })
      .addTo(map)
      .bindPopup('<b>Your Current Location (Origin)</b>');

    const destMarker = L.marker([dest.latitude, dest.longitude], { icon: destIcon })
      .addTo(map)
      .bindPopup(`<b>Customer Destination</b><br/>${destinationAddress?.houseNumber}, ${destinationAddress?.streetName}`);

    // Draw Route Polyline
    if (route?.coordinates && route.coordinates.length > 0) {
      const latLngs = route.coordinates.map((c) => [c.latitude, c.longitude]);
      const polyline = L.polyline(latLngs, {
        color: '#10B981',
        weight: 5,
        opacity: 0.85,
        lineJoin: 'round',
      }).addTo(map);

      polylineLayerRef.current = polyline;

      // Fit map bounds to encompass both markers and line
      const bounds = L.latLngBounds([
        [origin.latitude, origin.longitude],
        [dest.latitude, dest.longitude],
        ...latLngs,
      ]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-gray-900 leading-tight">
                Doorstep Delivery Navigation #{orderNumber}
              </h3>
              <span className="text-[11px] text-gray-400 font-semibold block">
                Shortest & Fastest Route to Customer Destination
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {permissionDenied && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-800 font-semibold">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                GPS location permission wasn't granted. Showing approximate route; you can also launch external Google Maps below.
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-2xl">
              {errorMsg}
            </div>
          )}

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100">
            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase block">Route Distance</span>
              <strong className="text-base font-black text-gray-900">
                {routeData?.distanceKm || '--'} km
              </strong>
            </div>

            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase block">Estimated Travel</span>
              <strong className="text-base font-black text-brand">
                ~{routeData?.durationMinutes || '--'} mins
              </strong>
            </div>

            <div className="col-span-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRouteMode('fastest')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  routeMode === 'fastest'
                    ? 'bg-brand text-white shadow-xs'
                    : 'bg-white border border-gray-200 text-gray-600'
                }`}
              >
                Fastest Driving
              </button>
              <button
                type="button"
                onClick={() => setRouteMode('shortest')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  routeMode === 'shortest'
                    ? 'bg-brand text-white shadow-xs'
                    : 'bg-white border border-gray-200 text-gray-600'
                }`}
              >
                Shortest Route
              </button>
            </div>
          </div>

          {/* Interactive Leaflet Map Container */}
          <div className="relative rounded-2xl overflow-hidden border border-gray-200 h-72 sm:h-96 bg-gray-100 shadow-inner">
            {loading && (
              <div className="absolute inset-0 bg-white/80 z-20 flex flex-col items-center justify-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
                <span className="text-xs font-bold text-gray-600">Calculating interactive route...</span>
              </div>
            )}
            <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 10 }}></div>
          </div>

          {/* Destination Details & External Google Maps Link */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="space-y-0.5 text-xs text-gray-600">
              <span className="font-bold text-gray-900 block">
                Deliver to: {destinationAddress?.fullName} • {destinationAddress?.phone}
              </span>
              <p>
                {destinationAddress?.houseNumber}, {destinationAddress?.streetName}, {destinationAddress?.area},{' '}
                {destinationAddress?.city} - {destinationAddress?.postalCode}
              </p>
              {destinationAddress?.landmark && (
                <p className="text-[11px] text-gray-500 font-semibold">
                  Landmark: {destinationAddress.landmark}
                </p>
              )}
            </div>

            {routeData?.externalNavigationUrl && (
              <a
                href={routeData.externalNavigationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open in Google Maps App</span>
              </a>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-colors cursor-pointer"
          >
            Close Navigation
          </button>
        </div>
      </div>
    </div>
  );
};

export default RouteNavigationModal;
