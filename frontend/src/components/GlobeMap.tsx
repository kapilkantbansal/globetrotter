import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  Compass,
  RotateCw,
  Moon,
  Sun,
  MapPin,
  Flag,
  Crosshair,
  ArrowRight,
  Search,
  Layers,
  Sparkles,
  Navigation,
  PlusCircle,
} from "lucide-react";
import type { StoredStop } from "@/lib/itineraryStore";
import { cityCoords } from "@/data/cityCoords";
import countriesData from "@/data/countries.json";
import majorCitiesData from "@/data/majorCities.json";
import countryPolygonsData from "@/data/countries-boundaries.json";
import countryCentroids from "@/data/countryCentroids.json";
import { getCityFallbackImage } from "@/lib/cityImageHelper";
import "./3d-map.css";

declare global {
  interface Window {
    THREE?: any;
    Globe?: any;
  }
}

interface CountryRecord {
  id: number;
  name: string;
  iso2: string;
  lat: number;
  lng: number;
}

interface GlobeMapProps {
  stops: StoredStop[];
  tripName?: string | undefined;
  tripDates?: string | undefined;
  onSwitchTo2D?: () => void;
  isActive?: boolean;
}

interface GlobeStopPoint {
  id: string;
  name: string;
  sub: string;
  lat: number;
  lng: number;
  isOrigin: boolean;
  isStop: boolean;
  isDest: boolean;
  order: number;
  imageUrl?: string;
  landmark?: string;
}

interface GlobeArc {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: [string, string];
  label: string;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Earth radius in km
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

function getCityPresetImage(name: string): string {
  const n = name.toLowerCase().trim();
  if (n.includes("shimla"))
    return "https://images.unsplash.com/photo-1597074866923-dc0589150358?auto=format&fit=crop&w=800&q=80";
  if (n.includes("kasol"))
    return "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80";
  if (n.includes("manali"))
    return "https://images.unsplash.com/photo-1605649487212-47bdab064df8?auto=format&fit=crop&w=800&q=80";
  if (n.includes("jaipur"))
    return "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=800&q=80";
  if (n.includes("gwalior"))
    return "https://images.unsplash.com/photo-1598890777032-bde835ba27c2?auto=format&fit=crop&w=800&q=80";
  if (n.includes("delhi"))
    return "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=800&q=80";
  if (n.includes("mumbai"))
    return "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=800&q=80";
  if (n.includes("goa") || n.includes("panaji"))
    return "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80";
  if (n.includes("pune"))
    return "https://images.unsplash.com/photo-1588416936097-41850ab3d86d?auto=format&fit=crop&w=800&q=80";
  if (n.includes("chandigarh"))
    return "https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=800&q=80";
  if (n.includes("kochi"))
    return "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80";
  if (n.includes("london"))
    return "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80";
  return "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80";
}

// Built-in presets for recognized named trips when no custom stops are stored yet
function getTripPresetStops(tripName?: string): StoredStop[] {
  if (!tripName) return [];
  const lower = tripName.toLowerCase().trim();

  if (lower.includes("mountain")) {
    return [
      {
        id: "preset-shimla",
        city: {
          id: 133871,
          name: "Shimla",
          country: "India",
          region: "Himachal Pradesh",
          cost_index: 5,
          popularity: 9,
          latitude: 31.1667,
          longitude: 77.5833,
          image_url: "https://images.unsplash.com/photo-1597074866923-dc0589150358?auto=format&fit=crop&w=800&q=80",
          description: "Queen of the Hills, colonial architecture and Himalayan views.",
        },
        start_date: "2026-09-17",
        end_date: "2026-09-19",
        activity_ids: [],
      },
      {
        id: "preset-kasol",
        city: {
          id: 163965,
          name: "Kasol",
          country: "India",
          region: "Himachal Pradesh",
          cost_index: 4,
          popularity: 8,
          latitude: 32.01,
          longitude: 75.98,
          image_url: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80",
          description: "Scenic hamlet along the Parvati River in the Parvati Valley.",
        },
        start_date: "2026-09-19",
        end_date: "2026-09-20",
        activity_ids: [],
      },
      {
        id: "preset-manali",
        city: {
          id: 132929,
          name: "Manali",
          country: "India",
          region: "Himachal Pradesh",
          cost_index: 5,
          popularity: 10,
          latitude: 32.2574,
          longitude: 77.1748,
          image_url: "https://images.unsplash.com/photo-1605649487212-47bdab064df8?auto=format&fit=crop&w=800&q=80",
          description: "High-altitude Himalayan resort town with snow-capped peaks and adventure valleys.",
        },
        start_date: "2026-09-20",
        end_date: "2026-09-22",
        activity_ids: [],
      },
    ];
  }

  if (lower.includes("goa")) {
    return [
      {
        id: "preset-mumbai",
        city: {
          id: 132938,
          name: "Mumbai",
          country: "India",
          region: "Maharashtra",
          cost_index: 7,
          popularity: 9,
          latitude: 19.0728,
          longitude: 72.8826,
          image_url: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=800&q=80",
        },
        start_date: "2026-09-23",
        end_date: "2026-09-24",
        activity_ids: [],
      },
      {
        id: "preset-pune",
        city: {
          id: 133446,
          name: "Pune",
          country: "India",
          region: "Maharashtra",
          cost_index: 5,
          popularity: 8,
          latitude: 18.5204,
          longitude: 73.8567,
          image_url: "https://images.unsplash.com/photo-1588416936097-41850ab3d86d?auto=format&fit=crop&w=800&q=80",
        },
        start_date: "2026-09-24",
        end_date: "2026-09-25",
        activity_ids: [],
      },
      {
        id: "preset-goa",
        city: {
          id: 133342,
          name: "Goa",
          country: "India",
          region: "Goa",
          cost_index: 6,
          popularity: 10,
          latitude: 15.4957,
          longitude: 73.8262,
          image_url: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80",
        },
        start_date: "2026-09-25",
        end_date: "2026-09-27",
        activity_ids: [],
      },
    ];
  }

  if (lower.includes("ocean")) {
    return [
      {
        id: "preset-mumbai-ocean",
        city: {
          id: 132938,
          name: "Mumbai",
          country: "India",
          region: "Maharashtra",
          cost_index: 7,
          popularity: 9,
          latitude: 19.0728,
          longitude: 72.8826,
          image_url: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=800&q=80",
        },
        start_date: "2026-09-28",
        end_date: "2026-09-29",
        activity_ids: [],
      },
      {
        id: "preset-goa-ocean",
        city: {
          id: 133342,
          name: "Goa",
          country: "India",
          region: "Goa",
          cost_index: 6,
          popularity: 9,
          latitude: 15.4957,
          longitude: 73.8262,
          image_url: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80",
        },
        start_date: "2026-09-29",
        end_date: "2026-09-30",
        activity_ids: [],
      },
      {
        id: "preset-kochi",
        city: {
          id: 132645,
          name: "Kochi",
          country: "India",
          region: "Kerala",
          cost_index: 5,
          popularity: 9,
          latitude: 9.9312,
          longitude: 76.2673,
          image_url: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80",
        },
        start_date: "2026-09-30",
        end_date: "2026-10-01",
        activity_ids: [],
      },
    ];
  }

  if (lower.includes("manali")) {
    return [
      {
        id: "preset-delhi-m",
        city: {
          id: 132041,
          name: "Delhi",
          country: "India",
          region: "Delhi",
          cost_index: 6,
          popularity: 9,
          latitude: 28.6139,
          longitude: 77.2090,
          image_url: "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=800&q=80",
        },
        start_date: "2026-12-01",
        end_date: "2026-12-02",
        activity_ids: [],
      },
      {
        id: "preset-chandigarh",
        city: {
          id: 131976,
          name: "Chandigarh",
          country: "India",
          region: "Chandigarh",
          cost_index: 5,
          popularity: 8,
          latitude: 30.7333,
          longitude: 76.7794,
          image_url: "https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=800&q=80",
        },
        start_date: "2026-12-02",
        end_date: "2026-12-03",
        activity_ids: [],
      },
      {
        id: "preset-manali-m",
        city: {
          id: 132929,
          name: "Manali",
          country: "India",
          region: "Himachal Pradesh",
          cost_index: 5,
          popularity: 10,
          latitude: 32.2574,
          longitude: 77.1748,
          image_url: "https://images.unsplash.com/photo-1605649487212-47bdab064df8?auto=format&fit=crop&w=800&q=80",
        },
        start_date: "2026-12-03",
        end_date: "2026-12-05",
        activity_ids: [],
      },
    ];
  }

  if (lower.includes("london")) {
    return [
      {
        id: "preset-london",
        city: {
          id: 1001,
          name: "London",
          country: "United Kingdom",
          region: "England",
          cost_index: 8,
          popularity: 10,
          latitude: 51.5074,
          longitude: -0.1278,
          image_url: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80",
        },
        start_date: "2026-12-01",
        end_date: "2026-12-04",
        activity_ids: [],
      },
      {
        id: "preset-oxford",
        city: {
          id: 1002,
          name: "Oxford",
          country: "United Kingdom",
          region: "England",
          cost_index: 7,
          popularity: 8,
          latitude: 51.7520,
          longitude: -1.2577,
          image_url: "https://images.unsplash.com/photo-1590059390046-512c0a96f131?auto=format&fit=crop&w=800&q=80",
        },
        start_date: "2026-12-04",
        end_date: "2026-12-06",
        activity_ids: [],
      },
      {
        id: "preset-edinburgh",
        city: {
          id: 1003,
          name: "Edinburgh",
          country: "United Kingdom",
          region: "Scotland",
          cost_index: 7,
          popularity: 9,
          latitude: 55.9533,
          longitude: -3.1883,
          image_url: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=800&q=80",
        },
        start_date: "2026-12-06",
        end_date: "2026-12-10",
        activity_ids: [],
      },
    ];
  }

  if (lower.includes("kapil")) {
    return [
      {
        id: "preset-delhi-k",
        city: {
          id: 132041,
          name: "Delhi",
          country: "India",
          region: "Delhi",
          cost_index: 6,
          popularity: 9,
          latitude: 28.6139,
          longitude: 77.2090,
          image_url: "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=800&q=80",
        },
        start_date: "2026-08-22",
        end_date: "2026-08-23",
        activity_ids: [],
      },
      {
        id: "preset-jaipur-k",
        city: {
          id: 132201,
          name: "Jaipur",
          country: "India",
          region: "Rajasthan",
          cost_index: 5,
          popularity: 9,
          latitude: 26.9124,
          longitude: 75.7873,
          image_url: "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=800&q=80",
        },
        start_date: "2026-08-23",
        end_date: "2026-08-24",
        activity_ids: [],
      },
      {
        id: "preset-gwalior-k",
        city: {
          id: 132040,
          name: "Gwalior",
          country: "India",
          region: "Madhya Pradesh",
          cost_index: 4,
          popularity: 8,
          latitude: 26.2298,
          longitude: 78.1734,
          image_url: "https://images.unsplash.com/photo-1598890777032-bde835ba27c2?auto=format&fit=crop&w=800&q=80",
        },
        start_date: "2026-08-24",
        end_date: "2026-08-25",
        activity_ids: [],
      },
    ];
  }

  return [];
}

export function GlobeMap({ stops, tripName, tripDates, onSwitchTo2D, isActive = true }: GlobeMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeInstanceRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [nightMode, setNightMode] = useState(true);

  // Search filter inside 3D map
  const [searchFilter, setSearchFilter] = useState("");

  // Country HUD hover
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [hoveredLandmark, setHoveredLandmark] = useState<GlobeStopPoint | null>(null);
  const [zoomLevelText, setZoomLevelText] = useState("🌍 World View — Countries");

  // Wheel zoom toggle (false by default so scrolling over the globe scrolls the webpage down!)
  const [wheelZoomEnabled, setWheelZoomEnabled] = useState(false);

  const zoomIn = () => {
    if (!globeInstanceRef.current) return;
    const pov = globeInstanceRef.current.pointOfView();
    globeInstanceRef.current.pointOfView(
      { altitude: Math.max(0.18, (pov?.altitude || 1.5) * 0.72) },
      400
    );
  };

  const zoomOut = () => {
    if (!globeInstanceRef.current) return;
    const pov = globeInstanceRef.current.pointOfView();
    globeInstanceRef.current.pointOfView(
      { altitude: Math.min(4.5, (pov?.altitude || 1.5) * 1.38) },
      400
    );
  };

  // Load external libraries Three.js and Globe.gl with singleton checks
  useEffect(() => {
    let isCancelled = false;

    async function loadLibraries() {
      if (!window.THREE) {
        await new Promise<void>((resolve, reject) => {
          const existing = document.getElementById("three-cdn-script");
          if (existing) {
            if (window.THREE) return resolve();
            existing.addEventListener("load", () => resolve());
            existing.addEventListener("error", reject);
            return;
          }
          const script = document.createElement("script");
          script.id = "three-cdn-script";
          script.src = "https://unpkg.com/three@0.160.0/build/three.min.js";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Three.js"));
          document.head.appendChild(script);
        });
      }

      if (!window.Globe) {
        await new Promise<void>((resolve, reject) => {
          const existing = document.getElementById("globegl-cdn-script");
          if (existing) {
            if (window.Globe) return resolve();
            existing.addEventListener("load", () => resolve());
            existing.addEventListener("error", reject);
            return;
          }
          const script = document.createElement("script");
          script.id = "globegl-cdn-script";
          script.src = "https://unpkg.com/globe.gl@2.32.0/dist/globe.gl.min.js";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Globe.gl"));
          document.head.appendChild(script);
        });
      }

      if (!isCancelled) {
        setIsLoaded(true);
      }
    }

    loadLibraries().catch((err) => console.error("Error loading Globe libraries:", err));

    return () => {
      isCancelled = true;
    };
  }, []);

  // Compute resolved points automatically from active trip
  const points: GlobeStopPoint[] = useMemo(() => {
    let rawStops = stops;

    // If no custom stops stored yet, provide the decided trip route
    if (!rawStops || rawStops.length === 0) {
      rawStops = getTripPresetStops(tripName);
    }

    if (!rawStops || rawStops.length === 0) {
      return [];
    }

    // Deduplicate consecutive stops with identical city names (e.g. fix jaipur -> jaipur)
    const deduped: StoredStop[] = [];
    for (const st of rawStops) {
      const last = deduped[deduped.length - 1];
      if (!last || last.city.name.toLowerCase().trim() !== st.city.name.toLowerCase().trim()) {
        deduped.push(st);
      }
    }

    const resolved = deduped
      .map((stop, idx) => {
        const cityName = stop.city?.name?.toLowerCase().trim() || "";
        const cityId = stop.city?.id;

        // Check database cache for lat/lng
        const majorMatch = (majorCitiesData as Record<string, any>)[cityName];
        const fallback = cityId ? cityCoords[cityId] : undefined;

        const lat =
          (stop.city as any)?.latitude ??
          majorMatch?.lat ??
          fallback?.lat;
        const lng =
          (stop.city as any)?.longitude ??
          majorMatch?.lng ??
          fallback?.lon;

        if (lat == null || lng == null) return null;

        const isOrigin = idx === 0;
        const isDest = idx === deduped.length - 1 && deduped.length > 1;
        const isStop = !isOrigin && !isDest;

        const imageUrl =
          (stop.city as any)?.image_url ||
          getCityFallbackImage(stop.city.name, stop.city.country) ||
          getCityPresetImage(stop.city.name);

        return {
          id: stop.id || `stop-${idx}`,
          name: stop.city.name,
          sub:
            stop.city.region
              ? `${stop.city.region}, ${stop.city.country}`
              : stop.city.country,
          lat: Number(lat),
          lng: Number(lng),
          isOrigin,
          isStop,
          isDest,
          order: idx + 1,
          imageUrl,
          landmark: `${stop.city.name} Sight`,
        };
      })
      .filter(Boolean) as GlobeStopPoint[];

    return resolved;
  }, [stops, tripName]);

  // Compute flight arcs connecting the active trip's stops sequentially
  const arcs: GlobeArc[] = useMemo(() => {
    const res: GlobeArc[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i]!;
      const p2 = points[i + 1]!;
      const dist = calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
      res.push({
        startLat: p1.lat,
        startLng: p1.lng,
        endLat: p2.lat,
        endLng: p2.lng,
        color: ["#10b981", "#38bdf8"],
        label: `${p1.name} → ${p2.name} (${dist.toLocaleString()} km)`,
      });
    }
    return res;
  }, [points]);

  // Real route distance & estimated flight duration
  const totalDistanceKm = useMemo(() => {
    let total = 0;
    for (let i = 0; i < points.length - 1; i++) {
      total += calculateDistance(
        points[i]!.lat,
        points[i]!.lng,
        points[i + 1]!.lat,
        points[i + 1]!.lng
      );
    }
    return total;
  }, [points]);

  const totalDistanceMiles = Math.round(totalDistanceKm * 0.621371);
  const estFlightHours = (totalDistanceKm / 800).toFixed(1);

  // Countries dataset for search
  const allCountries = (countriesData as CountryRecord[]) || [];

  // Filtered countries based on search input
  const filteredCountries = useMemo(() => {
    if (!searchFilter.trim()) return allCountries;
    const q = searchFilter.toLowerCase().trim();
    return allCountries.filter((c) => c.name.toLowerCase().includes(q));
  }, [allCountries, searchFilter]);

  // Origin, intermediate stops, and destination references
  const originPoint = points.length > 0 ? points[0]! : null;
  const destinationPoint = points.length > 1 ? points[points.length - 1]! : null;
  const intermediateStops = points.filter((p) => p.isStop);

  // 1. Initialize Globe ONCE on mount (optimized for smooth 60fps rendering)
  useEffect(() => {
    if (!isLoaded || !containerRef.current || !window.Globe || globeInstanceRef.current) return;

    const globe = window.Globe()(containerRef.current)
      .globeImageUrl(
        nightMode
          ? "//unpkg.com/three-globe/example/img/earth-night.jpg"
          : "//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
      )
      .backgroundColor("#020617")
      .showAtmosphere(true)
      .atmosphereColor("#38bdf8")
      .atmosphereAltitude(0.20);

    // Limit pixel ratio to 1.0 strictly to prevent high-DPI GPU fillrate bottleneck
    try {
      const renderer = globe.renderer();
      if (renderer) {
        renderer.setPixelRatio(1.0);
        if (renderer.powerPreference) renderer.powerPreference = "high-performance";
      }
    } catch {
      // Ignore if renderer not directly exposed
    }

    // 1. COUNTRY BOUNDARIES (Lightweight GeoJSON Polygons with crisp borders, zero transition overhead)
    globe
      .polygonsData((countryPolygonsData as any).features || [])
      .polygonsTransitionDuration(0)
      .polygonCapColor(() => "rgba(0, 0, 0, 0)")
      .polygonSideColor(() => "rgba(0, 0, 0, 0)")
      .polygonStrokeColor(() => "rgba(56, 189, 248, 0.65)")
      .polygonAltitude(0.005)
      .polygonLabel(({ properties: d }: any) => `
        <div style="background: rgba(15, 23, 42, 0.92); backdrop-filter: blur(10px); border: 1px solid rgba(56, 189, 248, 0.4); padding: 5px 12px; border-radius: 8px; color: #fff; font-size: 11px; font-weight: 700; box-shadow: 0 4px 14px rgba(0,0,0,0.6);">
          ${d.ADMIN || d.NAME}
        </div>
      `);

    // 2. COUNTRY NAMES between boundaries (Rendered at polygon centroids with labelResolution 1 for zero stutter)
    globe
      .labelsData(countryCentroids || [])
      .labelsTransitionDuration(0)
      .labelLat((d: any) => d.lat)
      .labelLng((d: any) => d.lng)
      .labelText((d: any) => d.name)
      .labelSize(0.65)
      .labelDotRadius(0)
      .labelColor(() => "rgba(255, 255, 255, 0.8)")
      .labelAltitude(0.008)
      .labelResolution(1);

    // 3. FLIGHT ARCS between journey stops
    globe
      .arcStartLat((d: any) => d.startLat)
      .arcStartLng((d: any) => d.startLng)
      .arcEndLat((d: any) => d.endLat)
      .arcEndLng((d: any) => d.endLng)
      .arcColor((d: any) => d.color)
      .arcAltitude(0.26)
      .arcStroke(2.2)
      .arcDashLength(0.5)
      .arcDashGap(0.12)
      .arcDashAnimateTime(2000);

    // 4. CITY LANDMARK / PIN HTML BADGES
    globe
      .htmlLat((d: any) => d.lat)
      .htmlLng((d: any) => d.lng)
      .htmlAltitude(0.015)
      .htmlElement((d: GlobeStopPoint) => {
        const el = document.createElement("div");
        el.className = `photo-pin-badge ${
          d.isOrigin ? "origin" : d.isDest ? "destination" : "waypoint"
        }`;

        const color = d.isOrigin
          ? "#10b981"
          : d.isDest
          ? "#f43f5e"
          : "#38bdf8";

        el.innerHTML = `
          <div class="pin-avatar-ring">
            ${
              d.imageUrl
                ? `<img src="${d.imageUrl}" alt="${d.name}" />`
                : `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:${color};font-weight:bold;font-size:12px;">${d.order}</div>`
            }
          </div>
          <div class="pin-label-pill">
            <span class="pin-city-text">${d.name}</span>
            <span class="pin-state-text" style="color:${color};">${
              d.isOrigin
                ? "🟢 Origin"
                : d.isDest
                ? "🔴 Destination"
                : `Stop #${d.order}`
            }</span>
          </div>
          <div class="pin-pulse-beacon"></div>
        `;

        el.addEventListener("mouseenter", () => setHoveredLandmark(d));
        el.addEventListener("mouseleave", () => setHoveredLandmark(null));
        return el;
      });

    // 5. SMOOTH ORBIT CONTROLS & DAMPING
    const controls = globe.controls();
    if (controls) {
      controls.autoRotate = autoRotate;
      controls.autoRotateSpeed = 0.5;
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.enableZoom = wheelZoomEnabled;

      let lastZoomText = "🌍 World View — Countries";
      controls.addEventListener("change", () => {
        const dist = controls.getDistance ? controls.getDistance() : 300;
        const newText =
          dist > 350
            ? "🌍 World View — Countries"
            : dist > 220
            ? "🗺️ Regional View — States & Routes"
            : "📍 City View — Flight Route & Stops";
        if (newText !== lastZoomText) {
          lastZoomText = newText;
          setZoomLevelText(newText);
        }
      });
    }

    // Responsive resize handler
    const handleResize = () => {
      if (containerRef.current && globe) {
        globe.width(containerRef.current.clientWidth);
        globe.height(containerRef.current.clientHeight);
      }
    };
    window.addEventListener("resize", handleResize);

    globeInstanceRef.current = globe;

    return () => {
      window.removeEventListener("resize", handleResize);
      if (globeInstanceRef.current) {
        try {
          globeInstanceRef.current.pauseAnimation?.();
          globeInstanceRef.current._destructor?.();
          const renderer = globeInstanceRef.current.renderer?.();
          if (renderer) {
            renderer.dispose?.();
            if (renderer.domElement && renderer.domElement.parentElement) {
              renderer.domElement.parentElement.removeChild(renderer.domElement);
            }
          }
        } catch (e) {
          console.warn("Globe cleanup error:", e);
        }
        globeInstanceRef.current = null;
      }
    };
  }, [isLoaded]);

  // Pause or resume rendering when GlobeMap tab is active/inactive to eliminate background lag
  useEffect(() => {
    if (!globeInstanceRef.current) return;
    if (isActive) {
      try {
        globeInstanceRef.current.resumeAnimation?.();
        const controls = globeInstanceRef.current.controls?.();
        if (controls) controls.autoRotate = autoRotate;
      } catch {}
    } else {
      try {
        globeInstanceRef.current.pauseAnimation?.();
        const controls = globeInstanceRef.current.controls?.();
        if (controls) controls.autoRotate = false;
      } catch {}
    }
  }, [isActive, autoRotate]);

  // 2. Update Route Data (Arcs, Pins, Camera Flight) whenever active trip points change
  useEffect(() => {
    const globe = globeInstanceRef.current;
    if (!globe) return;

    globe.arcsData(arcs);
    globe.htmlElementsData(points);

    // Smoothly fly camera to frame the active trip's route
    if (points.length > 0) {
      const midLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
      const midLng = points.reduce((s, p) => s + p.lng, 0) / points.length;
      globe.pointOfView(
        { lat: midLat, lng: midLng, altitude: points.length > 1 ? 1.6 : 1.2 },
        1400
      );
    }
  }, [points, arcs]);

  // Update controls when autoRotate or wheelZoomEnabled changes
  useEffect(() => {
    if (!globeInstanceRef.current) return;
    const controls = globeInstanceRef.current.controls();
    if (controls) {
      controls.autoRotate = autoRotate;
      controls.enableZoom = wheelZoomEnabled;
    }
  }, [autoRotate, wheelZoomEnabled]);

  // Update Day / Night Earth texture
  useEffect(() => {
    if (!globeInstanceRef.current) return;
    globeInstanceRef.current.globeImageUrl(
      nightMode
        ? "//unpkg.com/three-globe/example/img/earth-night.jpg"
        : "//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
    );
  }, [nightMode]);

  // Frame route on globe
  function frameRoute() {
    if (!globeInstanceRef.current || points.length === 0) return;
    const midLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
    const midLng = points.reduce((s, p) => s + p.lng, 0) / points.length;
    globeInstanceRef.current.pointOfView(
      { lat: midLat, lng: midLng, altitude: points.length > 1 ? 1.6 : 1.1 },
      1400
    );
  }

  // Country search pick & camera flight
  function handleCountryPick(c: CountryRecord) {
    if (globeInstanceRef.current) {
      globeInstanceRef.current.pointOfView(
        { lat: c.lat, lng: c.lng, altitude: 1.4 },
        1400
      );
      setHoveredCountry(c.name);
    }
  }

  return (
    <div className="globe-app-root">
      {/* 3D WebGL Globe Canvas Container */}
      <div id="globeViz" ref={containerRef} className="globe-viz-canvas" />

      {/* Switch to 2D Map Button (Top Right) */}
      <button
        type="button"
        onClick={onSwitchTo2D}
        className="map-switch-mode-btn"
        title="View in 2D Interactive Route Map"
      >
        <MapPin style={{ width: 16, height: 16, color: "var(--accent, #38bdf8)" }} />
        <span>View in 2D Map</span>
      </button>

      {/* Floating Zoom In / Out Buttons (+ / -) */}
      <div className="globe-zoom-controls">
        <button
          type="button"
          className="globe-zoom-btn"
          onClick={zoomIn}
          title="Zoom In (+)"
        >
          +
        </button>
        <button
          type="button"
          className="globe-zoom-btn"
          onClick={zoomOut}
          title="Zoom Out (−)"
        >
          −
        </button>
      </div>

      {/* Left Control & Route Panel */}
      <div className="map-control-panel control-panel">
        <div className="map-panel-header panel-header">
          <div className="map-panel-brand panel-brand">
            <Compass style={{ width: 22, height: 22 }} />
            <span>Voyage 3D Explorer</span>
          </div>
          <div className="map-header-actions header-actions">
            {/* Auto Spin Toggle */}
            <button
              className={`map-action-btn action-btn ${autoRotate ? "active" : ""}`}
              id="btnAutoSpin"
              title="Toggle Auto-Rotation"
              onClick={() => setAutoRotate((r) => !r)}
            >
              <RotateCw style={{ width: 16, height: 16 }} />
            </button>
            {/* Day / Night Earth Lighting Toggle */}
            <button
              className="map-action-btn action-btn"
              id="btnGlobeTheme"
              title="Toggle Day / Night Earth Lighting"
              onClick={() => setNightMode((n) => !n)}
            >
              {nightMode ? (
                <Moon style={{ width: 16, height: 16 }} />
              ) : (
                <Sun style={{ width: 16, height: 16 }} />
              )}
            </button>
          </div>
        </div>

        {/* Real-Time Attached Pictures Bar: Origin -> Intermediate Stops -> Destination */}
        {points.length === 0 ? (
          <div className="mb-4 rounded-2xl border border-dashed border-white/20 bg-slate-900/60 p-4 text-center">
            <p className="text-xs font-semibold text-gray-300">
              No destinations planned yet for{" "}
              <span className="text-sky-400 font-bold">{tripName || "this trip"}</span>
            </p>
            <a
              href="/cities"
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 px-4 py-1.5 text-xs font-bold text-sky-400 transition hover:bg-sky-500/30"
            >
              <PlusCircle className="size-3.5" />
              Add Stops in Cities & Route
            </a>
          </div>
        ) : (
          <div className="map-trip-photos-bar trip-photos-bar">
            {/* Origin Card */}
            {originPoint && (
              <div className="map-trip-card-item trip-card-item">
                {originPoint.imageUrl ? (
                  <img
                    id="barOriginImg"
                    className="map-trip-thumb trip-thumb origin"
                    src={originPoint.imageUrl}
                    alt="Origin"
                  />
                ) : (
                  <div className="map-trip-thumb trip-thumb origin text-emerald-400">
                    A
                  </div>
                )}
                <div className="map-trip-info trip-info">
                  <div
                    className="map-trip-type trip-type"
                    style={{ color: "var(--start-color, #10b981)" }}
                  >
                    ORIGIN
                  </div>
                  <div className="map-trip-city trip-city" id="barOriginCity">
                    {originPoint.name}
                  </div>
                  <div className="map-trip-sub trip-sub" id="barOriginSub">
                    {originPoint.sub}
                  </div>
                </div>
              </div>
            )}

            {/* Intermediate Stops in sequence (if any in trip) */}
            {intermediateStops.map((stop) => (
              <React.Fragment key={stop.id}>
                <div className="map-flight-separator flight-separator">
                  <ArrowRight style={{ width: 15, height: 15 }} />
                  <span style={{ fontSize: 8, fontWeight: 700, opacity: 0.8 }}>
                    STOP
                  </span>
                </div>

                <div className="map-trip-card-item trip-card-item">
                  {stop.imageUrl ? (
                    <img
                      className="map-trip-thumb trip-thumb stop"
                      src={stop.imageUrl}
                      alt={stop.name}
                    />
                  ) : (
                    <div className="map-trip-thumb trip-thumb stop text-sky-400">
                      {stop.order}
                    </div>
                  )}
                  <div className="map-trip-info trip-info">
                    <div
                      className="map-trip-type trip-type"
                      style={{ color: "#38bdf8" }}
                    >
                      STOP {stop.order - 1}
                    </div>
                    <div className="map-trip-city trip-city">{stop.name}</div>
                    <div className="map-trip-sub trip-sub">{stop.sub}</div>
                  </div>
                </div>
              </React.Fragment>
            ))}

            {/* Destination Card */}
            {destinationPoint && (
              <>
                <div className="map-flight-separator flight-separator">
                  <ArrowRight style={{ width: 16, height: 16 }} />
                  <span style={{ fontSize: 8, fontWeight: 700, opacity: 0.8 }}>
                    ROUTE
                  </span>
                </div>

                <div
                  className="map-trip-card-item trip-card-item"
                  style={{ justifyContent: "flex-end", textAlign: "right" }}
                >
                  <div className="map-trip-info trip-info">
                    <div
                      className="map-trip-type trip-type"
                      style={{ color: "var(--dest-color, #f43f5e)" }}
                    >
                      DESTINATION
                    </div>
                    <div className="map-trip-city trip-city" id="barDestCity">
                      {destinationPoint.name}
                    </div>
                    <div className="map-trip-sub trip-sub" id="barDestSub">
                      {destinationPoint.sub}
                    </div>
                  </div>
                  {destinationPoint.imageUrl ? (
                    <img
                      id="barDestImg"
                      className="map-trip-thumb trip-thumb dest"
                      src={destinationPoint.imageUrl}
                      alt="Destination"
                    />
                  ) : (
                    <div className="map-trip-thumb trip-thumb dest text-rose-400">
                      B
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Search Filter for Country / City */}
        <div className="map-search-filter-box search-filter-box">
          <Search
            className="map-search-icon search-icon"
            style={{ width: 15, height: 15 }}
          />
          <input
            type="text"
            id="citySearch"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search Country or City on Globe..."
          />
        </div>

        {/* Search results dropdown if typing */}
        {searchFilter.trim() && filteredCountries.length > 0 && (
          <div className="mb-3 max-h-36 overflow-y-auto rounded-xl border border-white/15 bg-slate-900/95 p-1 text-xs">
            {filteredCountries.slice(0, 8).map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  handleCountryPick(c);
                  setSearchFilter("");
                }}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-white hover:bg-white/10"
              >
                <span className="font-semibold">{c.name}</span>
                <span className="text-[10px] text-sky-400">{c.iso2}</span>
              </button>
            ))}
          </div>
        )}

        {/* AUTOMATED JOURNEY STOPS DISPLAY (Loaded directly from the active trip) */}
        {points.length > 0 ? (
          <div className="map-journey-stops-display">
            {/* Origin Stop */}
            {originPoint && (
              <div className="map-journey-stop-row">
                <span className="map-journey-stop-label text-emerald-400">
                  <MapPin style={{ width: 13, height: 13 }} />
                  ORIGIN (CITY, STATE, COUNTRY)
                </span>
                <span className="map-journey-stop-val">
                  {originPoint.name}, {originPoint.sub}
                </span>
              </div>
            )}

            {/* Intermediate Stops */}
            {intermediateStops.map((s, idx) => (
              <div key={s.id} className="map-journey-stop-row">
                <span className="map-journey-stop-label text-sky-400">
                  <Navigation style={{ width: 13, height: 13 }} />
                  STOP {idx + 1} (VIA)
                </span>
                <span className="map-journey-stop-val">
                  {s.name}, {s.sub}
                </span>
              </div>
            ))}

            {/* Final Destination */}
            {destinationPoint && (
              <div className="map-journey-stop-row">
                <span className="map-journey-stop-label text-rose-400">
                  <Flag style={{ width: 13, height: 13 }} />
                  DESTINATION (CITY, STATE, COUNTRY)
                </span>
                <span className="map-journey-stop-val">
                  {destinationPoint.name}, {destinationPoint.sub}
                </span>
              </div>
            )}
          </div>
        ) : null}

        {/* Route Telemetry HUD with Real Distance and Est Flight Duration */}
        <div className="map-route-hud route-hud">
          <div className="map-hud-title hud-title">
            <span>Route Telemetry</span>
            <span className="map-hud-badge hud-badge">
              {tripName ? tripName.toUpperCase() : "ACTIVE TRIP"}
            </span>
          </div>
          <div className="map-hud-row hud-row">
            <span className="map-hud-key hud-key">Total Distance</span>
            <span className="map-hud-val hud-val" id="hudDistance">
              {totalDistanceKm > 0
                ? `${totalDistanceKm.toLocaleString()} km (${totalDistanceMiles.toLocaleString()} mi)`
                : "-- km"}
            </span>
          </div>
          <div className="map-hud-row hud-row">
            <span className="map-hud-key hud-key">Est. Flight Duration</span>
            <span className="map-hud-val hud-val" id="hudFlightTime">
              {totalDistanceKm > 0 ? `~${estFlightHours} hrs` : "-- hrs"}
            </span>
          </div>
          <div className="map-hud-row hud-row">
            <span className="map-hud-key hud-key">Origin Point</span>
            <span
              className="map-hud-val hud-val"
              id="hudOriginName"
              style={{ color: "var(--start-color, #10b981)" }}
            >
              {originPoint ? `${originPoint.name}, ${originPoint.sub}` : "--"}
            </span>
          </div>
          <div className="map-hud-row hud-row">
            <span className="map-hud-key hud-key">Destination Point</span>
            <span
              className="map-hud-val hud-val"
              id="hudDestName"
              style={{ color: "var(--dest-color, #f43f5e)" }}
            >
              {destinationPoint
                ? `${destinationPoint.name}, ${destinationPoint.sub}`
                : originPoint
                ? `${originPoint.name} (Single Destination)`
                : "--"}
            </span>
          </div>
        </div>

        <button
          className="map-btn-frame-route btn-frame-route"
          id="btnFrameRoute"
          onClick={frameRoute}
          disabled={points.length === 0}
        >
          <Crosshair style={{ width: 16, height: 16 }} />
          <span>Frame Route On Globe</span>
        </button>
      </div>

      {/* Hover Indicator for Country Borders */}
      <div
        className={`map-country-hud country-hud ${
          hoveredCountry ? "active" : ""
        }`}
        id="countryHud"
      >
        <Flag style={{ width: 16, height: 16, color: "var(--accent, #38bdf8)" }} />
        <span id="countryHudName">{hoveredCountry ?? "Country Name"}</span>
      </div>

      {/* Zoom Level Indicator: 🌍 World View — Countries */}
      <div className="map-zoom-level-hud zoom-level-hud" id="zoomLevelHud">
        <Layers style={{ width: 14, height: 14, color: "var(--accent, #38bdf8)" }} />
        <span id="zoomLevelText">{zoomLevelText}</span>
      </div>

      {/* Dynamic Hover Card for 3D City Landmarks with Images */}
      <div
        className={`map-hover-card hover-card ${
          hoveredLandmark ? "visible" : ""
        }`}
        id="hoverCard"
        style={{ top: 20, right: 20 }}
      >
        <div className="map-hover-img-wrap hover-img-wrap">
          <img
            id="cardImage"
            src={hoveredLandmark?.imageUrl ?? ""}
            alt={hoveredLandmark?.name ?? ""}
          />
          <div className="map-hover-badge hover-badge" id="cardLandmark">
            {hoveredLandmark?.landmark ?? "Landmark Destination"}
          </div>
        </div>
        <div className="map-hover-content hover-content">
          <div className="map-hover-header hover-header">
            <h3 className="map-hover-title hover-title" id="cardCity">
              {hoveredLandmark?.name}
            </h3>
            <span
              id="cardRole"
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 7px",
                borderRadius: 10,
                background: hoveredLandmark?.isOrigin
                  ? "#10b98133"
                  : hoveredLandmark?.isDest
                  ? "#f43f5e33"
                  : "#38bdf833",
                color: hoveredLandmark?.isOrigin
                  ? "#10b981"
                  : hoveredLandmark?.isDest
                  ? "#f43f5e"
                  : "#38bdf8",
              }}
            >
              {hoveredLandmark?.isOrigin
                ? "🟢 Origin (Home City)"
                : hoveredLandmark?.isDest
                ? "🔴 Final Destination"
                : `Stop #${hoveredLandmark?.order}`}
            </span>
          </div>
          <div className="map-hover-location hover-location">
            <MapPin style={{ width: 14, height: 14 }} />
            <span id="cardLocation">{hoveredLandmark?.sub}</span>
          </div>
          <div className="map-hover-quote hover-quote" id="cardQuote">
            Explore authentic city heritage and journey itinerary stops.
          </div>
          <div className="map-hover-coords hover-coords" id="cardCoords">
            Lat: {hoveredLandmark?.lat.toFixed(2)}°, Lng:{" "}
            {hoveredLandmark?.lng.toFixed(2)}°
          </div>
        </div>
      </div>

      {/* Camera Navigation Hints */}
      <div className="map-view-hints view-hints">
        <div className="map-hint-item hint-item">
          <Sparkles
            style={{ width: 14, height: 14, color: "var(--accent, #38bdf8)" }}
          />
          <span>
            Scroll to move down page · Use + / − buttons to zoom globe
          </span>
        </div>
        <div className="map-hint-item hint-item">
          <span>Drag</span> to rotate smoothly
        </div>
      </div>
    </div>
  );
}
