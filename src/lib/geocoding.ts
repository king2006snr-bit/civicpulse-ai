/**
 * Google Maps Geocoding & Reverse-Geocoding Service
 * Supports arbitrary cities, addresses, coordinates, and instant preset resolution
 */

export interface GeocodedLocation {
  lat: number;
  lng: number;
  formattedAddress: string;
}

// Well-known coordinates for instant resolution without network delay
const PRESET_LOCATIONS: Record<string, GeocodedLocation> = {
  vijayawada: {
    lat: 16.5062,
    lng: 80.648,
    formattedAddress: "Vijayawada, Andhra Pradesh, India",
  },
  guntur: {
    lat: 16.3067,
    lng: 80.4365,
    formattedAddress: "Guntur, Andhra Pradesh, India",
  },
  visakhapatnam: {
    lat: 17.6868,
    lng: 83.2185,
    formattedAddress: "Visakhapatnam, Andhra Pradesh, India",
  },
  vizag: {
    lat: 17.6868,
    lng: 83.2185,
    formattedAddress: "Visakhapatnam, Andhra Pradesh, India",
  },
  hyderabad: {
    lat: 17.385,
    lng: 78.4867,
    formattedAddress: "Hyderabad, Telangana, India",
  },
  chennai: {
    lat: 13.0827,
    lng: 80.2707,
    formattedAddress: "Chennai, Tamil Nadu, India",
  },
  bengaluru: {
    lat: 12.9716,
    lng: 77.5946,
    formattedAddress: "Bengaluru, Karnataka, India",
  },
  bangalore: {
    lat: 12.9716,
    lng: 77.5946,
    formattedAddress: "Bengaluru, Karnataka, India",
  },
  amaravati: {
    lat: 16.5417,
    lng: 80.5158,
    formattedAddress: "Amaravati, Andhra Pradesh, India",
  },
  rajahmundry: {
    lat: 17.0005,
    lng: 81.804,
    formattedAddress: "Rajahmundry, Andhra Pradesh, India",
  },
  tirupati: {
    lat: 13.6288,
    lng: 79.4192,
    formattedAddress: "Tirupati, Andhra Pradesh, India",
  },
  mumbai: {
    lat: 19.076,
    lng: 72.8777,
    formattedAddress: "Mumbai, Maharashtra, India",
  },
  delhi: {
    lat: 28.6139,
    lng: 77.209,
    formattedAddress: "New Delhi, Delhi, India",
  },
};

/**
 * Parses raw coordinate strings like "16.5062, 80.6480" or "(16.5062° N, 80.6480° E)"
 */
export function extractCoordsFromString(text: string): { lat: number; lng: number } | null {
  if (!text) return null;
  const match = text.match(/(-?\d+\.\d+)\s*°?\s*[NS]?\s*,\s*(-?\d+\.\d+)\s*°?\s*[EW]?/i);
  if (match && match[1] && match[2]) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }
  return null;
}

/**
 * Geocode any place name, city, address, or landmark using Google Maps Geocoding API
 */
export async function geocodeLocation(
  query: string,
  apiKey: string,
): Promise<GeocodedLocation | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  // Check if string contains explicit coordinates
  const explicitCoords = extractCoordsFromString(trimmed);
  if (explicitCoords) {
    return {
      lat: explicitCoords.lat,
      lng: explicitCoords.lng,
      formattedAddress: trimmed,
    };
  }

  // Check preset cities for instant response
  const lower = trimmed.toLowerCase();
  for (const [key, preset] of Object.entries(PRESET_LOCATIONS)) {
    if (lower === key || lower.includes(key)) {
      return preset;
    }
  }

  // Query Google Maps Geocoding API
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(trimmed)}&key=${apiKey}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const item = data.results[0];
        return {
          lat: item.geometry.location.lat,
          lng: item.geometry.location.lng,
          formattedAddress: item.formatted_address,
        };
      }
    }
  } catch (err) {
    console.warn("Geocoding API network fetch failed, using fallback:", err);
  }

  return null;
}

/**
 * Reverse geocode latitude and longitude into human-readable street address
 */
export async function reverseGeocodeCoords(
  lat: number,
  lng: number,
  apiKey: string,
): Promise<string> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        return data.results[0].formatted_address;
      }
    }
  } catch (err) {
    console.warn("Reverse geocode fetch failed:", err);
  }

  return `${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E`;
}
