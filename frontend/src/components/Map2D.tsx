import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  Compass,
  MapPin,
  Flag,
  Crosshair,
  ArrowRight,
  Search,
  Navigation,
  Globe,
  Map as MapIcon,
  Satellite,
  Minus,
  Maximize2,
  Sparkles,
  Car,
  Plane,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { StoredStop } from '@/lib/itineraryStore';
import { cityCoords } from '@/data/cityCoords';
import majorCitiesData from '@/data/majorCities.json';
import { getDrivingRoute, type RouteResult } from '@/lib/routingService';
import { getCityFallbackImage } from '@/lib/cityImageHelper';
import './3d-map.css';
import './2d-map.css';

declare global {
  interface Window {
    L?: any;
    LANDMARK_CITIES?: any[];
  }
}

interface Map2DProps {
  stops: StoredStop[];
  tripName?: string | undefined;
  tripDates?: string | undefined;
  onSwitchTo3D?: () => void;
  isActive?: boolean;
}

interface LandmarkCity {
  id: string;
  name: string;
  state: string;
  country: string;
  region: 'Europe' | 'Asia' | 'Americas' | 'Africa' | 'Oceania';
  lat: number;
  lng: number;
  landmark: string;
  quote: string;
  image: string;
}

const DEFAULT_LANDMARKS: LandmarkCity[] = [
  // Europe
  { id: 'london', name: 'London', state: 'England', country: 'United Kingdom', region: 'Europe', lat: 51.505, lng: -0.09, landmark: 'Big Ben & Westminster', quote: 'When a man is tired of London, he is tired of life.', image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&auto=format&fit=crop&q=80' },
  { id: 'paris', name: 'Paris', state: 'Île-de-France', country: 'France', region: 'Europe', lat: 48.8566, lng: 2.3522, landmark: 'Eiffel Tower', quote: 'Paris is always a good idea.', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&auto=format&fit=crop&q=80' },
  { id: 'rome', name: 'Rome', state: 'Lazio', country: 'Italy', region: 'Europe', lat: 41.9028, lng: 12.4964, landmark: 'Colosseum', quote: 'Rome is not a city like any other; it is a big museum.', image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&auto=format&fit=crop&q=80' },
  { id: 'barcelona', name: 'Barcelona', state: 'Catalonia', country: 'Spain', region: 'Europe', lat: 41.3851, lng: 2.1734, landmark: 'Sagrada Família', quote: 'Barcelona, such a beautiful horizon.', image: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=600&auto=format&fit=crop&q=80' },
  { id: 'amsterdam', name: 'Amsterdam', state: 'North Holland', country: 'Netherlands', region: 'Europe', lat: 52.3676, lng: 4.9041, landmark: 'Canals & Rijksmuseum', quote: 'Some tourists think Amsterdam is a city of sin, but in truth it is a city of freedom.', image: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=600&auto=format&fit=crop&q=80' },

  // Asia
  { id: 'tokyo', name: 'Tokyo', state: 'Tokyo', country: 'Japan', region: 'Asia', lat: 35.6762, lng: 139.6503, landmark: 'Shibuya & Senso-ji', quote: 'If you go to Tokyo, your mind will be blown.', image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=600&auto=format&fit=crop&q=80' },
  { id: 'mumbai', name: 'Mumbai', state: 'Maharashtra', country: 'India', region: 'Asia', lat: 19.076, lng: 72.8777, landmark: 'Gateway of India', quote: 'The city that never sleeps, driven by dreams.', image: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=600&auto=format&fit=crop&q=80' },
  { id: 'delhi', name: 'New Delhi', state: 'Delhi', country: 'India', region: 'Asia', lat: 28.6139, lng: 77.209, landmark: 'India Gate & Red Fort', quote: 'Dilli hai dilwalon ki — heart of historic dynasties.', image: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=600&auto=format&fit=crop&q=80' },
  { id: 'jaipur', name: 'Jaipur', state: 'Rajasthan', country: 'India', region: 'Asia', lat: 26.9124, lng: 75.7873, landmark: 'Hawa Mahal & Amber Palace', quote: 'The royal Pink City of palatial heritage.', image: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=600&auto=format&fit=crop&q=80' },
  { id: 'shimla', name: 'Shimla', state: 'Himachal Pradesh', country: 'India', region: 'Asia', lat: 31.1048, lng: 77.1734, landmark: 'The Ridge & Mall Road', quote: 'Queen of the Hills, snow-dusted pine valleys.', image: 'https://images.unsplash.com/photo-1597074866923-dc0589150358?w=600&auto=format&fit=crop&q=80' },
  { id: 'kasol', name: 'Kasol', state: 'Himachal Pradesh', country: 'India', region: 'Asia', lat: 32.01, lng: 75.98, landmark: 'Parvati River Trail', quote: 'Mystic haven nestled deep in pine forests.', image: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=600&auto=format&fit=crop&q=80' },
  { id: 'manali', name: 'Manali', state: 'Himachal Pradesh', country: 'India', region: 'Asia', lat: 32.2396, lng: 77.1887, landmark: 'Rohtang Pass & Solang Valley', quote: 'Adventure gateway to high Himalayan peaks.', image: 'https://images.unsplash.com/photo-1605649487212-47bdab064df8?w=600&auto=format&fit=crop&q=80' },
  { id: 'singapore', name: 'Singapore', state: 'Singapore', country: 'Singapore', region: 'Asia', lat: 1.3521, lng: 103.8198, landmark: 'Marina Bay Sands', quote: 'A garden city of the 21st century.', image: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=600&auto=format&fit=crop&q=80' },
  { id: 'dubai', name: 'Dubai', state: 'Dubai', country: 'United Arab Emirates', region: 'Asia', lat: 25.2048, lng: 55.2708, landmark: 'Burj Khalifa', quote: 'Where futuristic wonder rises from desert sands.', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&auto=format&fit=crop&q=80' },

  // Americas
  { id: 'newyork', name: 'New York', state: 'New York', country: 'United States', region: 'Americas', lat: 40.7128, lng: -74.006, landmark: 'Statue of Liberty & Times Square', quote: 'Concrete jungle where dreams are made of.', image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&auto=format&fit=crop&q=80' },
  { id: 'sanfrancisco', name: 'San Francisco', state: 'California', country: 'United States', region: 'Americas', lat: 37.7749, lng: -122.4194, landmark: 'Golden Gate Bridge', quote: 'Leaving my heart in the city by the bay.', image: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=600&auto=format&fit=crop&q=80' },
  { id: 'riodejaneiro', name: 'Rio de Janeiro', state: 'Rio de Janeiro', country: 'Brazil', region: 'Americas', lat: -22.9068, lng: -43.1729, landmark: 'Christ the Redeemer', quote: 'God made the world in six days and Rio on the seventh.', image: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=600&auto=format&fit=crop&q=80' },

  // Africa
  { id: 'cairo', name: 'Cairo', state: 'Cairo', country: 'Egypt', region: 'Africa', lat: 30.0444, lng: 31.2357, landmark: 'Pyramids of Giza', quote: 'Man fears time, but time fears the Pyramids.', image: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=600&auto=format&fit=crop&q=80' },
  { id: 'capetown', name: 'Cape Town', state: 'Western Cape', country: 'South Africa', region: 'Africa', lat: -33.9249, lng: 18.4241, landmark: 'Table Mountain', quote: 'Where two oceans embrace beneath towering granite.', image: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=600&auto=format&fit=crop&q=80' },

  // Oceania
  { id: 'sydney', name: 'Sydney', state: 'New South Wales', country: 'Australia', region: 'Oceania', lat: -33.8688, lng: 151.2093, landmark: 'Sydney Opera House', quote: 'Sunlit harbor and world-class oceanic vitality.', image: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=600&auto=format&fit=crop&q=80' }
];

const SPECIAL_ISLANDS = [
  {
    name: 'Lakshadweep Islands',
    group: 'Union Territory of India',
    lat: 10.5667,
    lng: 72.6417,
    zoom: 9,
    description: 'Emerald coral atolls and turquoise lagoons in the Arabian Sea.',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Andaman & Nicobar Islands',
    group: 'Union Territory of India',
    lat: 11.6234,
    lng: 92.7265,
    zoom: 8,
    description: 'Pristine tropical rainforest islands and turquoise coral reefs.',
    image: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?w=600&auto=format&fit=crop&q=80',
  },
];

// Helper to resolve coordinates for any city safely
function getCoordinatesForCity(city: any): { lat: number; lng: number } | null {
  if (!city) return null;
  const rawLat = city.latitude ?? city.lat;
  const rawLng = city.longitude ?? city.lng ?? city.lon;
  if (rawLat != null && rawLng != null) {
    const lat = Number(rawLat);
    const lng = Number(rawLng);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }
  if (city.id && (cityCoords as any)[city.id]) {
    const c = (cityCoords as any)[city.id];
    return { lat: c.lat, lng: c.lon };
  }
  if (city.name) {
    const key = city.name.toLowerCase().trim();
    const c = (majorCitiesData as any)[key];
    if (c && Number.isFinite(c.lat) && Number.isFinite(c.lng)) {
      return { lat: Number(c.lat), lng: Number(c.lng) };
    }
    if (key.includes('lakshadweep') || key.includes('kavaratti')) return { lat: 10.5667, lng: 72.6417 };
    if (key.includes('zürich') || key.includes('zurich')) return { lat: 47.3769, lng: 8.5417 };
    if (key.includes('goa') || key.includes('panaji')) return { lat: 15.4957, lng: 73.8262 };
    if (key.includes('shimla')) return { lat: 31.1048, lng: 77.1734 };
    if (key.includes('manali')) return { lat: 32.2396, lng: 77.1887 };
    if (key.includes('kasol')) return { lat: 32.01, lng: 75.98 };
    if (key.includes('delhi')) return { lat: 28.6139, lng: 77.209 };
    if (key.includes('mumbai')) return { lat: 19.076, lng: 72.8777 };
    if (key.includes('jaipur')) return { lat: 26.9124, lng: 75.7873 };
  }
  return null;
}

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  if (!Number.isFinite(lat1) || !Number.isFinite(lon1) || !Number.isFinite(lat2) || !Number.isFinite(lon2)) {
    return 0;
  }
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Singleton Leaflet library loader to avoid duplicate script injection
function loadLeafletEngine(): Promise<any> {
  if (typeof window !== 'undefined' && window.L) {
    return Promise.resolve(window.L);
  }
  return new Promise((resolve, reject) => {
    if (!document.getElementById('leaflet-cdn-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-cdn-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    const existingScript = document.getElementById('leaflet-cdn-script') as HTMLScriptElement;
    if (existingScript) {
      if (window.L) return resolve(window.L);
      existingScript.addEventListener('load', () => resolve(window.L));
      existingScript.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.id = 'leaflet-cdn-script';
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

export function Map2D({ stops, tripName, tripDates, onSwitchTo3D, isActive = true }: Map2DProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const layersRef = useRef<{ street: any; satellite: any }>({ street: null, satellite: null });
  const currentLayerRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);

  const [activeLayer, setActiveLayer] = useState<'street' | 'satellite'>('street');
  const [searchQuery, setSearchQuery] = useState('');
  const [startId, setStartId] = useState('london');
  const [destId, setDestId] = useState('paris');
  const [isMinimized, setIsMinimized] = useState(false);
  const [drivingRoute, setDrivingRoute] = useState<RouteResult | null>(null);
  const [showLegs, setShowLegs] = useState(false);

  // Sync cities list with defaults + any stops from active trip with coordinates resolution
  const citiesList = useMemo(() => {
    const map = new Map<string, LandmarkCity>();
    DEFAULT_LANDMARKS.forEach((c) => map.set(c.id, c));

    if (stops && stops.length > 0) {
      stops.forEach((s, idx) => {
        const name = s.city?.name || 'Stop ' + (idx + 1);
        const coords = getCoordinatesForCity(s.city);
        if (coords) {
          const id = 'stop-' + (s.city?.id || s.id || idx);
          map.set(id, {
            id,
            name,
            state: s.city?.region || '',
            country: s.city?.country || 'India',
            region: 'Asia',
            lat: coords.lat,
            lng: coords.lng,
            landmark: s.city?.description || name,
            quote: s.city?.description || 'A wonderful waypoint along your journey.',
            image: s.city?.image_url || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&auto=format&fit=crop&q=80',
          });
        }
      });
    }

    return Array.from(map.values());
  }, [stops]);

  // Set initial start/dest when trip stops change
  useEffect(() => {
    if (stops && stops.length >= 2) {
      const sCoords = getCoordinatesForCity(stops[0]?.city);
      const dCoords = getCoordinatesForCity(stops[stops.length - 1]?.city);
      if (sCoords) {
        setStartId('stop-' + (stops[0]?.city?.id || stops[0]?.id || '0'));
      }
      if (dCoords) {
        setDestId('stop-' + (stops[stops.length - 1]?.city?.id || stops[stops.length - 1]?.id || 'last'));
      }
    } else if (stops && stops.length === 1) {
      const sCoords = getCoordinatesForCity(stops[0]?.city);
      if (sCoords) {
        setStartId('stop-' + (stops[0]?.city?.id || stops[0]?.id || '0'));
      }
    }
  }, [stops]);

  const startCity: LandmarkCity = citiesList.find((c) => c.id === startId) || citiesList[0] || DEFAULT_LANDMARKS[0]!;
  const destCity: LandmarkCity = citiesList.find((c) => c.id === destId) || citiesList[1] || citiesList[0] || DEFAULT_LANDMARKS[1]!;

  // Fetch highway driving route when start/dest changes
  useEffect(() => {
    let canceled = false;
    async function loadRoute() {
      if (!startCity || !destCity || startCity.id === destCity.id) {
        setDrivingRoute(null);
        return;
      }
      try {
        const waypoints: [number, number][] = [[startCity.lat, startCity.lng]];
        if (stops && stops.length > 2) {
          stops.slice(1, -1).forEach((s) => {
            const c = getCoordinatesForCity(s.city);
            if (c) waypoints.push([c.lat, c.lng]);
          });
        }
        waypoints.push([destCity.lat, destCity.lng]);
        const res = await getDrivingRoute(waypoints);
        if (!canceled) {
          setDrivingRoute(res);
        }
      } catch {
        if (!canceled) setDrivingRoute(null);
      }
    }
    loadRoute();
    return () => {
      canceled = true;
    };
  }, [startCity, destCity, stops]);

  // Helper for custom pin icon
  const createCustomIcon = useCallback((role: 'origin' | 'dest' | 'stop' | 'landmark', label?: string) => {
    const L = window.L;
    if (!L) return undefined;
    const cls = role === 'origin' ? 'origin' : role === 'dest' ? 'dest' : 'landmark';
    const symbol = role === 'origin' ? '🟢' : role === 'dest' ? '🔴' : label || '📍';

    return L.divIcon({
      className: '',
      html: `
        <div class="custom-pin-wrap">
          <div class="pin-circle ${cls}">${symbol}</div>
          <div class="pin-pointer ${cls}"></div>
        </div>
      `,
      iconSize: [32, 40],
      iconAnchor: [16, 40],
      popupAnchor: [0, -42],
    });
  }, []);

  // Helper for Pretty Customizable CSS Popup matching 2d-map.html
  const createPopupContent = useCallback((city: LandmarkCity, role: 'origin' | 'dest' | 'stop' | 'landmark') => {
    const badgeClass = role === 'origin' ? 'origin' : role === 'dest' ? 'dest' : 'regular';
    const badgeText =
      role === 'origin'
        ? '🟢 ORIGIN (HOME CITY)'
        : role === 'dest'
        ? '🔴 DESTINATION'
        : (city.region || 'LANDMARK').toUpperCase();
    const imgUrl =
      city.image ||
      getCityFallbackImage(city.name, city.country);

    return `
      <div>
        <img class="popup-card-img" src="${imgUrl}" alt="${city.name}" />
        <div class="popup-card-body">
          <div class="popup-card-header">
            <h3 class="popup-card-title">${city.name}</h3>
            <span class="popup-card-badge ${badgeClass}">${badgeText}</span>
          </div>
          <div class="popup-card-location">
            <span>📍 ${city.state ? city.state + ', ' : ''}${city.country}</span>
          </div>
          <div class="popup-card-quote">${city.quote || 'A pretty CSS popup.<br> Easily customizable.'}</div>
          <div class="popup-card-coords">Lat: ${city.lat.toFixed(4)}° | Lng: ${city.lng.toFixed(4)}°</div>
        </div>
      </div>
    `;
  }, []);

  // Update Route Polyline & Markers with full safety
  const renderRouteAndMarkers = useCallback(() => {
    try {
      const map = mapInstanceRef.current;
      const L = window.L;
      if (!map || !L || !markersGroupRef.current) return;

      markersGroupRef.current.clearLayers();

      // 1. Add Origin Marker
      if (Number.isFinite(startCity.lat) && Number.isFinite(startCity.lng)) {
        const startMarker = L.marker([startCity.lat, startCity.lng], {
          icon: createCustomIcon('origin'),
        }).bindPopup(createPopupContent(startCity, 'origin'));
        markersGroupRef.current.addLayer(startMarker);
      }

      // 2. Add Destination Marker
      if (Number.isFinite(destCity.lat) && Number.isFinite(destCity.lng)) {
        const destMarker = L.marker([destCity.lat, destCity.lng], {
          icon: createCustomIcon('dest'),
        }).bindPopup(createPopupContent(destCity, 'dest'));
        markersGroupRef.current.addLayer(destMarker);
      }

      // 3. Add Intermediate stops if any
      if (stops && stops.length > 2) {
        stops.slice(1, -1).forEach((s, idx) => {
          const c = getCoordinatesForCity(s.city);
          if (c) {
            const stopCity: LandmarkCity = {
              id: 'stop-' + idx,
              name: s.city.name,
              state: s.city.region || '',
              country: s.city.country || 'India',
              region: 'Asia',
              lat: c.lat,
              lng: c.lng,
              landmark: s.city.name,
              quote: s.city.description || 'Waypoint stop along your journey.',
              image: s.city.image_url || '',
            };
            const stopMarker = L.marker([c.lat, c.lng], {
              icon: createCustomIcon('stop', String(idx + 1)),
            }).bindPopup(createPopupContent(stopCity, 'stop'));
            markersGroupRef.current.addLayer(stopMarker);
          }
        });
      }

      // 4. Add Special Islands (Lakshadweep & Andaman)
      SPECIAL_ISLANDS.forEach((island) => {
        const islandIcon = L.divIcon({
          className: '',
          html: `
            <div style="display:flex; flex-direction:column; align-items:center; cursor:pointer;">
              <div style="width:14px; height:14px; border-radius:50%; background:#38bdf8; border:2px solid #ffffff; box-shadow:0 0 12px #38bdf8;"></div>
              <div style="font-size:10px; font-weight:800; color:#38bdf8; text-shadow:0 1px 4px rgba(0,0,0,0.9); margin-top:2px; white-space:nowrap;">
                🏝️ ${island.name}
              </div>
            </div>
          `,
          iconSize: [120, 30],
          iconAnchor: [60, 7],
          popupAnchor: [0, -10],
        });

        const islandMarker = L.marker([island.lat, island.lng], { icon: islandIcon }).bindPopup(`
          <div style="max-width:220px; font-family:inherit;">
            <img src="${island.image}" style="width:100%; height:110px; object-fit:cover; border-radius:8px 8px 0 0; margin-bottom:8px;" />
            <h4 style="margin:0 0 4px 0; color:#38bdf8; font-size:14px; font-weight:700;">🏝️ ${island.name}</h4>
            <div style="font-size:11px; color:#cbd5e1; margin-bottom:6px;">${island.group}</div>
            <p style="margin:0; font-size:11px; color:#94a3b8; line-height:1.4;">${island.description}</p>
          </div>
        `);
        markersGroupRef.current.addLayer(islandMarker);
      });

      // 5. Add Other Landmark Cities
      citiesList.forEach((c) => {
        if (c.id !== startCity.id && c.id !== destCity.id && !c.id.startsWith('stop-') && Number.isFinite(c.lat) && Number.isFinite(c.lng)) {
          const marker = L.marker([c.lat, c.lng], {
            icon: createCustomIcon('landmark'),
          }).bindPopup(createPopupContent(c, 'landmark'));
          markersGroupRef.current.addLayer(marker);
        }
      });

      // 6. Draw Route Polyline
      if (polylineRef.current) {
        try {
          map.removeLayer(polylineRef.current);
        } catch {}
        polylineRef.current = null;
      }

      let latlngs: [number, number][] = [];
      if (drivingRoute?.coordinates && drivingRoute.coordinates.length > 0) {
        latlngs = drivingRoute.coordinates;
      } else {
        if (Number.isFinite(startCity.lat) && Number.isFinite(startCity.lng)) {
          latlngs.push([startCity.lat, startCity.lng]);
        }
        if (stops && stops.length > 2) {
          stops.slice(1, -1).forEach((s) => {
            const c = getCoordinatesForCity(s.city);
            if (c) latlngs.push([c.lat, c.lng]);
          });
        }
        if (Number.isFinite(destCity.lat) && Number.isFinite(destCity.lng)) {
          latlngs.push([destCity.lat, destCity.lng]);
        }
      }

      if (latlngs.length >= 2) {
        polylineRef.current = L.polyline(latlngs, {
          color: '#38bdf8',
          weight: 5,
          opacity: 0.9,
          lineCap: 'round',
        }).addTo(map);
      }
    } catch (err) {
      console.warn('Map2D renderRouteAndMarkers warning:', err);
    }
  }, [startCity, destCity, stops, drivingRoute, citiesList, createCustomIcon, createPopupContent]);

  // Initialize Map Engine safely with zero-leak protection
  useEffect(() => {
    let isMounted = true;

    async function initMapEngine() {
      if (!isMounted || !mapContainerRef.current) return;
      if (mapInstanceRef.current) return;

      try {
        const L = await loadLeafletEngine();
        if (!isMounted || !mapContainerRef.current) return;

        // Clear any lingering Leaflet ID on DOM element
        if ((mapContainerRef.current as any)._leaflet_id) {
          delete (mapContainerRef.current as any)._leaflet_id;
        }

        const safeLat = Number.isFinite(startCity.lat) ? startCity.lat : 51.505;
        const safeLng = Number.isFinite(startCity.lng) ? startCity.lng : -0.09;

        const map = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: true,
        }).setView([safeLat, safeLng], 5);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // 100% English Global Map Layers
        const streetLayer = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
          {
            attribution: 'Tiles &copy; Esri &mdash; World Street Map (English)',
            maxZoom: 19,
          }
        );

        const satelliteLayer = L.layerGroup([
          L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            {
              attribution: 'Tiles &copy; Esri World Imagery',
              maxZoom: 19,
            }
          ),
          L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
            {
              attribution: 'Labels &copy; Esri English Places & Borders',
              maxZoom: 19,
            }
          ),
        ]);

        layersRef.current = { street: streetLayer, satellite: satelliteLayer };
        currentLayerRef.current = streetLayer.addTo(map);
        markersGroupRef.current = L.layerGroup().addTo(map);

        mapInstanceRef.current = map;

        // Handle user location found
        map.on('locationfound', (e: any) => {
          try {
            L.circle(e.latlng, { radius: e.accuracy, color: '#38bdf8' }).addTo(map);
            L.marker(e.latlng)
              .addTo(map)
              .bindPopup(`<b>You are here!</b><br>Accuracy: ~${Math.round(e.accuracy)} meters`)
              .openPopup();
          } catch {}
        });

        renderRouteAndMarkers();
      } catch (err) {
        console.error('Error initializing Map2D engine:', err);
      }
    }

    initMapEngine();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }
      if (mapContainerRef.current && (mapContainerRef.current as any)._leaflet_id) {
        delete (mapContainerRef.current as any)._leaflet_id;
      }
    };
  }, []);

  // Invalidate map size when tab becomes active
  useEffect(() => {
    if (isActive && mapInstanceRef.current) {
      setTimeout(() => {
        try {
          mapInstanceRef.current.invalidateSize();
        } catch {}
      }, 50);
    }
  }, [isActive]);

  // Update route and markers when selections or route change
  useEffect(() => {
    renderRouteAndMarkers();
  }, [renderRouteAndMarkers]);

  // Switch layers
  const switchLayer = (type: 'street' | 'satellite') => {
    const map = mapInstanceRef.current;
    if (!map || !layersRef.current.street || !layersRef.current.satellite) return;

    try {
      if (currentLayerRef.current) {
        map.removeLayer(currentLayerRef.current);
      }
      const next = layersRef.current[type];
      currentLayerRef.current = next.addTo(map);
      setActiveLayer(type);
    } catch {}
  };

  // Fit Route To Screen
  const handleFitRoute = () => {
    const map = mapInstanceRef.current;
    if (map && polylineRef.current) {
      try {
        const bounds = polylineRef.current.getBounds();
        if (bounds && bounds.isValid && bounds.isValid()) {
          map.fitBounds(bounds, { padding: [80, 80], maxZoom: 10 });
        }
      } catch {}
    }
  };

  // Center on User Location
  const handleLocateMe = () => {
    const map = mapInstanceRef.current;
    if (map) {
      try {
        map.locate({ setView: true, maxZoom: 12 });
      } catch {}
    }
  };

  // Demo popup matching 2d-map (1).js
  const handleDemoPopup = () => {
    const map = mapInstanceRef.current;
    const L = window.L;
    if (!map || !L) return;
    try {
      map.flyTo([51.5, -0.09], 13);
      setTimeout(() => {
        L.popup()
          .setLatLng([51.5, -0.09])
          .setContent(`
            <div style="padding: 16px; text-align: center;">
              <h3 style="margin: 0 0 8px 0; color: #38bdf8; font-size: 16px;">✨ London Marker</h3>
              <p style="margin: 0; color: #e2e8f0; font-size: 13px; line-height: 1.5;">A pretty CSS popup.<br> Easily customizable.</p>
            </div>
          `)
          .openOn(map);
      }, 1000);
    } catch {}
  };

  // Jump directly to Lakshadweep
  const handleJumpToLakshadweep = () => {
    const map = mapInstanceRef.current;
    if (map) {
      try {
        map.flyTo([10.5667, 72.6417], 9, { duration: 1.5 });
      } catch {}
    }
  };

  // Filter cities for origin & destination dropdowns
  const filteredCities = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return citiesList;
    return citiesList.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.state && c.state.toLowerCase().includes(q)) ||
        c.country.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q)
    );
  }, [citiesList, searchQuery]);

  const regions: ('Europe' | 'Asia' | 'Americas' | 'Africa' | 'Oceania')[] = [
    'Europe',
    'Asia',
    'Americas',
    'Africa',
    'Oceania',
  ];

  const totalDistanceKm = drivingRoute?.distanceKm ?? getDistanceKm(startCity.lat, startCity.lng, destCity.lat, destCity.lng);
  const totalDistanceMi = Math.round(totalDistanceKm * 0.621371);
  const estFlightHours = (totalDistanceKm / 850 + 0.5).toFixed(1);

  return (
    <div className="map-2d-root relative h-full w-full overflow-hidden bg-[#020617] font-sans">
      {/* 2D Map Canvas Container */}
      <div id="map" ref={mapContainerRef} className="map-2d-canvas h-full w-full" />

      {/* Top Center: ONLY Street & Satellite Mode (100% English Global Labels) */}
      <div className="layer-selector">
        <button
          type="button"
          className={`layer-opt ${activeLayer === 'street' ? 'active' : ''}`}
          onClick={() => switchLayer('street')}
          title="Street Map with 100% English Labels Worldwide"
        >
          <MapIcon style={{ width: 14, height: 14 }} />
          <span>Street (English)</span>
        </button>
        <button
          type="button"
          className={`layer-opt ${activeLayer === 'satellite' ? 'active' : ''}`}
          onClick={() => switchLayer('satellite')}
          title="Satellite Imagery with English Labels & Borders"
        >
          <Satellite style={{ width: 14, height: 14 }} />
          <span>Satellite (English)</span>
        </button>
      </div>

      {/* Top Right: Direct Switch to 3D Globe */}
      {onSwitchTo3D && (
        <button
          type="button"
          onClick={onSwitchTo3D}
          className="switch-mode-btn"
          title="Switch to 3D Interactive Globe"
        >
          <Globe style={{ width: 18, height: 18, color: 'var(--accent)' }} />
          <span>Switch to 3D Globe</span>
        </button>
      )}

      {/* Minimized Pill Button */}
      {isMinimized && (
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="absolute top-4 left-4 z-[500] flex items-center gap-2 rounded-full border border-sky-400/40 bg-slate-900/90 px-4 py-2 text-xs font-bold text-sky-400 shadow-2xl backdrop-blur-xl transition-all hover:bg-slate-800"
        >
          <Navigation className="size-4 animate-spin text-sky-400" />
          <span>Show Route Navigator ({startCity.name} → {destCity.name})</span>
        </button>
      )}

      {/* Left Control & Route Panel */}
      {!isMinimized && (
        <div className="control-panel overflow-y-auto">
          {/* Panel Header */}
          <div className="panel-header">
            <div className="panel-brand">
              <Navigation style={{ width: 22, height: 22 }} />
              <div>
                <div>2D Route Navigator</div>
                {tripName && (
                  <div className="text-[10px] font-normal text-sky-400">
                    {tripName} {tripDates ? `(${tripDates})` : ''}
                  </div>
                )}
              </div>
            </div>
            <div className="header-actions">
              {/* Locate button */}
              <button
                type="button"
                className="action-btn"
                onClick={handleLocateMe}
                title="Center on My Location"
              >
                <Crosshair style={{ width: 16, height: 16 }} />
              </button>
              {/* Demo Marker popup button */}
              <button
                type="button"
                className="action-btn"
                onClick={handleDemoPopup}
                title="Show Pretty Popup Demo"
              >
                <Sparkles style={{ width: 16, height: 16 }} />
              </button>
              {/* Minimize Panel */}
              <button
                type="button"
                className="action-btn"
                onClick={() => setIsMinimized(true)}
                title="Minimize Panel"
              >
                <Minus style={{ width: 16, height: 16 }} />
              </button>
            </div>
          </div>

          {/* Real-Time Attached Pictures Bar for Origin & Destination */}
          <div className="trip-photos-bar">
            <div className="trip-card-item">
              <img
                className="trip-thumb origin"
                src={startCity.image}
                alt={startCity.name}
              />
              <div className="trip-info">
                <div className="trip-type" style={{ color: 'var(--start-color)' }}>
                  Origin
                </div>
                <div className="trip-city">{startCity.name}</div>
                <div className="trip-sub">
                  {startCity.state ? `${startCity.state}, ` : ''}{startCity.country}
                </div>
              </div>
            </div>

            <div className="flight-separator">
              <ArrowRight style={{ width: 18, height: 18 }} />
              <span style={{ fontSize: 8, fontWeight: 700, opacity: 0.8 }}>ROUTE</span>
            </div>

            <div className="trip-card-item" style={{ justifyContent: 'flex-end', textAlign: 'right' }}>
              <div className="trip-info">
                <div className="trip-type" style={{ color: 'var(--dest-color)' }}>
                  Destination
                </div>
                <div className="trip-city">{destCity.name}</div>
                <div className="trip-sub">
                  {destCity.state ? `${destCity.state}, ` : ''}{destCity.country}
                </div>
              </div>
              <img
                className="trip-thumb dest"
                src={destCity.image}
                alt={destCity.name}
              />
            </div>
          </div>

          {/* Quick Islands Jump Button */}
          <button
            type="button"
            onClick={handleJumpToLakshadweep}
            className="mb-2 flex w-full items-center justify-between rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/20"
          >
            <span className="flex items-center gap-1.5">
              <span>🏝️</span>
              <span>Jump to Lakshadweep Atolls</span>
            </span>
            <span className="rounded bg-sky-400/20 px-1.5 py-0.5 text-[10px] font-bold text-sky-200">
              HD Zoom
            </span>
          </button>

          {/* Search Filter Box */}
          <div className="search-filter-box">
            <Search className="search-icon" style={{ width: 15, height: 15 }} />
            <input
              type="text"
              placeholder="Search City, State, or Country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Origin Dropdown */}
          <div className="form-group">
            <label>
              <MapPin style={{ width: 14, height: 14, color: 'var(--start-color)' }} /> Origin (City, State, Country)
            </label>
            <div className="select-box">
              <select
                value={startId}
                onChange={(e) => {
                  const val = e.target.value;
                  setStartId(val);
                  if (val === destId) {
                    const fallback = citiesList.find((c) => c.id !== val);
                    if (fallback) setDestId(fallback.id);
                  }
                  const chosen = citiesList.find((c) => c.id === val);
                  if (chosen && mapInstanceRef.current && Number.isFinite(chosen.lat) && Number.isFinite(chosen.lng)) {
                    mapInstanceRef.current.flyTo([chosen.lat, chosen.lng], 8);
                  }
                }}
              >
                {regions.map((region) => {
                  const inRegion = filteredCities.filter((c) => c.region === region);
                  if (inRegion.length === 0) return null;
                  return (
                    <optgroup key={region} label={`📍 ${region}`}>
                      {inRegion.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}, {c.state ? `${c.state}, ` : ''}{c.country}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
              <ChevronDown className="select-arrow" style={{ width: 16, height: 16 }} />
            </div>
          </div>

          {/* Destination Dropdown */}
          <div className="form-group">
            <label>
              <Flag style={{ width: 14, height: 14, color: 'var(--dest-color)' }} /> Destination (City, State, Country)
            </label>
            <div className="select-box">
              <select
                value={destId}
                onChange={(e) => {
                  const val = e.target.value;
                  setDestId(val);
                  if (val === startId) {
                    const fallback = citiesList.find((c) => c.id !== val);
                    if (fallback) setStartId(fallback.id);
                  }
                  const chosen = citiesList.find((c) => c.id === val);
                  if (chosen && mapInstanceRef.current && Number.isFinite(chosen.lat) && Number.isFinite(chosen.lng)) {
                    mapInstanceRef.current.flyTo([chosen.lat, chosen.lng], 8);
                  }
                }}
              >
                {regions.map((region) => {
                  const inRegion = filteredCities.filter((c) => c.region === region);
                  if (inRegion.length === 0) return null;
                  return (
                    <optgroup key={region} label={`📍 ${region}`}>
                      {inRegion.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}, {c.state ? `${c.state}, ` : ''}{c.country}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
              <ChevronDown className="select-arrow" style={{ width: 16, height: 16 }} />
            </div>
          </div>

          {/* Route Telemetry HUD */}
          <div className="route-hud">
            <div className="hud-title">
              <span>Route Telemetry</span>
              <span className="hud-badge">2D EXPLORER</span>
            </div>
            <div className="hud-row">
              <span className="hud-key">Total Distance</span>
              <span className="hud-val">
                {totalDistanceKm.toLocaleString()} km ({totalDistanceMi.toLocaleString()} mi)
              </span>
            </div>
            {drivingRoute && (
              <div className="hud-row">
                <span className="hud-key flex items-center gap-1">
                  <Car className="size-3 text-emerald-400" />
                  <span>Driving Duration</span>
                </span>
                <span className="hud-val text-emerald-300">
                  ~{drivingRoute.durationHours.toFixed(1)} hrs
                </span>
              </div>
            )}
            <div className="hud-row">
              <span className="hud-key flex items-center gap-1">
                <Plane className="size-3 text-sky-400" />
                <span>Est. Flight Duration</span>
              </span>
              <span className="hud-val text-sky-300">~{estFlightHours} hrs</span>
            </div>
            <div className="hud-row">
              <span className="hud-key">Origin Point</span>
              <span className="hud-val" style={{ color: 'var(--start-color)' }}>
                {startCity.name}, {startCity.country}
              </span>
            </div>
            <div className="hud-row">
              <span className="hud-key">Destination Point</span>
              <span className="hud-val" style={{ color: 'var(--dest-color)' }}>
                {destCity.name}, {destCity.country}
              </span>
            </div>

            {/* Per-leg Breakdown Toggle */}
            {drivingRoute?.legs && drivingRoute.legs.length > 1 && (
              <div className="mt-2 border-t border-white/10 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLegs(!showLegs)}
                  className="flex w-full items-center justify-between text-[11px] font-bold text-sky-300 hover:text-sky-200"
                >
                  <span>Leg-by-Leg Route Breakdown</span>
                  {showLegs ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                </button>

                {showLegs && (
                  <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {drivingRoute.legs.map((leg, i) => (
                      <div
                        key={i}
                        className="rounded-lg bg-slate-800/80 p-2 text-[10px] border border-white/5"
                      >
                        <div className="font-semibold text-gray-200">
                          Leg {i + 1}: {leg.summary || `Stop ${leg.fromIndex + 1} → Stop ${leg.toIndex + 1}`}
                        </div>
                        <div className="flex justify-between text-gray-400 mt-0.5">
                          <span>{leg.distanceKm} km</span>
                          <span>🚗 {leg.drivingHours}h | ✈️ {leg.flightHours}h</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fit Route Button */}
          <button
            type="button"
            className="btn-frame-route"
            onClick={handleFitRoute}
          >
            <Maximize2 style={{ width: 16, height: 16 }} />
            <span>Fit Route To Screen</span>
          </button>
        </div>
      )}

      {/* Camera Hints Bar */}
      <div className="view-hints">
        <div className="hint-item">
          <Compass style={{ width: 14, height: 14, color: 'var(--accent)' }} />
          <span>All Names Strictly in English</span>
        </div>
        <div className="hint-item">
          <Sparkles style={{ width: 14, height: 14, color: 'var(--accent)' }} />
          <span>Click city markers for customizable CSS popup</span>
        </div>
        <div className="hint-item">
          <span>Scroll</span> to zoom
        </div>
      </div>
    </div>
  );
}
