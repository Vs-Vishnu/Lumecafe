/**
 * Map & Routing Service
 *
 * Provides a provider-agnostic abstraction for address geocoding and route calculation.
 * Default provider: OpenStreetMap Nominatim + OSRM (free, open-source, no API keys needed).
 * Google Maps provider: activated if MAP_PROVIDER=google and GOOGLE_MAPS_API_KEY is configured.
 */

// In-memory geocode cache to respect rate limits
const geocodeCache = new Map();

/**
 * Format address object into searchable query string
 */
const formatAddressQuery = (addressObj) => {
  if (typeof addressObj === 'string') return addressObj.trim();
  const parts = [
    addressObj.houseNumber,
    addressObj.streetName,
    addressObj.area,
    addressObj.city,
    addressObj.state,
    addressObj.postalCode,
  ].filter(Boolean);
  return parts.join(', ');
};

/**
 * Geocode address to { latitude, longitude, displayName }
 */
const geocodeAddress = async (addressInput) => {
  const query = formatAddressQuery(addressInput);
  if (!query) {
    throw new Error('Address query cannot be empty.');
  }

  // Check cache
  if (geocodeCache.has(query)) {
    return geocodeCache.get(query);
  }

  const provider = process.env.MAP_PROVIDER || 'osm';
  const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (provider === 'google' && googleApiKey) {
    return await geocodeWithGoogle(query, googleApiKey);
  }

  // Default: OpenStreetMap Nominatim
  return await geocodeWithOSM(query);
};

/**
 * OpenStreetMap Nominatim Geocoding
 */
const geocodeWithOSM = async (query) => {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'LumeBills-Delivery-Platform/1.0 (delivery@lumebills.com)',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.statusText}`);
    }

    const data = await response.json();
    if (data && data.length > 0) {
      const result = {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        displayName: data[0].display_name,
        provider: 'osm',
      };
      geocodeCache.set(query, result);
      return result;
    }

    // Try a broader search by taking city and state if full street failed
    const parts = query.split(',').map((p) => p.trim());
    if (parts.length > 2) {
      const broaderQuery = parts.slice(-3).join(', ');
      const broaderUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(broaderQuery)}&limit=1`;
      const fallbackRes = await fetch(broaderUrl, {
        headers: {
          'User-Agent': 'LumeBills-Delivery-Platform/1.0 (delivery@lumebills.com)',
        },
      });
      const fallbackData = await fallbackRes.json();
      if (fallbackData && fallbackData.length > 0) {
        const result = {
          latitude: parseFloat(fallbackData[0].lat),
          longitude: parseFloat(fallbackData[0].lon),
          displayName: fallbackData[0].display_name,
          provider: 'osm',
          approximate: true,
        };
        geocodeCache.set(query, result);
        return result;
      }
    }

    return {
      latitude: null,
      longitude: null,
      displayName: query,
      provider: 'osm',
      failed: true,
      message: 'Address could not be resolved to precise coordinates. Fallback to external navigation supported.',
    };
  } catch (error) {
    console.error('[MapService] Geocoding error:', error.message);
    return {
      latitude: null,
      longitude: null,
      displayName: query,
      provider: 'osm',
      failed: true,
      error: error.message,
    };
  }
};

/**
 * Google Maps Geocoding
 */
const geocodeWithGoogle = async (query, apiKey) => {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const loc = data.results[0].geometry.location;
      const result = {
        latitude: loc.lat,
        longitude: loc.lng,
        displayName: data.results[0].formatted_address,
        provider: 'google',
      };
      geocodeCache.set(query, result);
      return result;
    }

    return {
      latitude: null,
      longitude: null,
      displayName: query,
      provider: 'google',
      failed: true,
      message: data.error_message || data.status,
    };
  } catch (error) {
    console.error('[MapService] Google Geocoding error:', error.message);
    return {
      latitude: null,
      longitude: null,
      displayName: query,
      provider: 'google',
      failed: true,
      error: error.message,
    };
  }
};

/**
 * Calculate Route between Origin and Destination
 * @param {Object} origin - { latitude, longitude }
 * @param {Object} destination - { latitude, longitude }
 * @param {String} mode - 'fastest' | 'shortest'
 */
const calculateRoute = async (origin, destination, mode = 'fastest') => {
  if (!origin?.latitude || !origin?.longitude || !destination?.latitude || !destination?.longitude) {
    throw new Error('Valid origin and destination coordinates are required for route navigation.');
  }

  const oLat = parseFloat(origin.latitude);
  const oLng = parseFloat(origin.longitude);
  const dLat = parseFloat(destination.latitude);
  const dLng = parseFloat(destination.longitude);

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${oLat},${oLng}&destination=${dLat},${dLng}&travelmode=driving`;

  try {
    // Project OSRM Routing (Driving profile)
    // OSRM coordinates format: {longitude},{latitude};{longitude},{latitude}
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${oLng},${oLat};${dLng},${dLat}?overview=full&geometries=geojson&steps=true`;

    const response = await fetch(osrmUrl);
    if (!response.ok) {
      throw new Error(`Routing service returned status: ${response.status}`);
    }

    const data = await response.json();
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const distanceKm = Number((route.distance / 1000).toFixed(2));
      const durationMins = Math.round(route.duration / 60);

      // Extract geojson coordinates [[lng, lat], ...] and map to [{lat, lng}, ...]
      const coordinates = (route.geometry?.coordinates || []).map((coord) => ({
        latitude: coord[1],
        longitude: coord[0],
      }));

      // Extract turn-by-turn steps
      const steps = (route.legs?.[0]?.steps || []).map((step) => ({
        instruction: step.maneuver?.type ? `${step.maneuver.type} ${step.name || ''}`.trim() : step.name,
        distanceKm: Number((step.distance / 1000).toFixed(2)),
        durationMins: Number((step.duration / 60).toFixed(1)),
      }));

      return {
        success: true,
        provider: 'osrm',
        mode: mode === 'shortest' ? 'Shortest Practical Route' : 'Fastest Driving Route',
        distanceKm,
        durationMinutes: durationMins,
        coordinates,
        steps,
        externalNavigationUrl: googleMapsUrl,
        origin: { latitude: oLat, longitude: oLng },
        destination: { latitude: dLat, longitude: dLng },
      };
    }

    // Direct distance calculation fallback (Haversine formula)
    return calculateHaversineFallback(oLat, oLng, dLat, dLng, googleMapsUrl);
  } catch (error) {
    console.warn('[MapService] OSRM live routing failed, providing geometric fallback:', error.message);
    return calculateHaversineFallback(oLat, oLng, dLat, dLng, googleMapsUrl);
  }
};

/**
 * Fallback route calculation using great-circle distance
 */
const calculateHaversineFallback = (oLat, oLng, dLat, dLng, externalNavigationUrl) => {
  const R = 6371; // Earth's radius in km
  const dLatRad = ((dLat - oLat) * Math.PI) / 180;
  const dLngRad = ((dLng - oLng) * Math.PI) / 180;
  const a =
    Math.sin(dLatRad / 2) * Math.sin(dLatRad / 2) +
    Math.cos((oLat * Math.PI) / 180) *
      Math.cos((dLat * Math.PI) / 180) *
      Math.sin(dLngRad / 2) *
      Math.sin(dLngRad / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const directDistanceKm = Number((R * c).toFixed(2));
  // Estimate driving distance ~ 1.3x direct distance, speed ~ 25 km/h in city
  const estimatedDrivingKm = Number((directDistanceKm * 1.3).toFixed(2));
  const estimatedMinutes = Math.max(5, Math.round((estimatedDrivingKm / 25) * 60));

  return {
    success: true,
    provider: 'fallback_haversine',
    mode: 'Estimated Direct Route',
    distanceKm: estimatedDrivingKm,
    durationMinutes: estimatedMinutes,
    coordinates: [
      { latitude: oLat, longitude: oLng },
      { latitude: dLat, longitude: dLng },
    ],
    steps: [
      { instruction: 'Head toward delivery destination', distanceKm: estimatedDrivingKm, durationMins: estimatedMinutes },
    ],
    externalNavigationUrl,
    origin: { latitude: oLat, longitude: oLng },
    destination: { latitude: dLat, longitude: dLng },
  };
};

module.exports = {
  geocodeAddress,
  calculateRoute,
};
