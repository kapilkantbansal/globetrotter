import { useEffect, useMemo, useState, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Compass,
  ExternalLink,
  Eye,
  Globe2,
  Info,
  Loader2,
  MapPin,
  Navigation,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { TripPicker } from "@/components/TripPicker";
import { loadTrips } from "@/lib/tripStore";
import { getMyTrips } from "@/api/tripsApi";
import { searchGeoCities, getCityDetails } from "@/api/citiesApi";
import { USE_FAKE_DATA } from "@/config";
import {
  loadStops,
  newStopId,
  saveStops,
  type StoredStop,
} from "@/lib/itineraryStore";
import type { City, CityDetail, GeoCitySearchResult, TripListItem } from "@/api/types";

export const Route = createFileRoute("/cities")({
  head: () => ({
    meta: [
      { title: "Cities — GlobeTrotter" },
      {
        name: "description",
        content:
          "Search cities across the globe, select departure, intermediate stops, and final destinations with authentic photos and guides.",
      },
      { property: "og:title", content: "Cities — GlobeTrotter" },
      {
        property: "og:description",
        content:
          "Plan your journey route: search global cities, add intermediate stops, and explore verified city details.",
      },
    ],
  }),
  component: CitiesPage,
});

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function CitySearchInput({
  label,
  placeholder,
  accentColor = "text-primary",
  onSelectCity,
}: {
  label: string;
  placeholder: string;
  accentColor?: string;
  onSelectCity: (city: GeoCitySearchResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoCitySearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      searchGeoCities(q, 12)
        .then((res) => {
          setResults(res.data);
          setOpen(true);
        })
        .catch(() => {
          setResults([]);
        })
        .finally(() => setLoading(false));
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div ref={wrapperRef} className="relative w-full">
      {label ? (
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-300">
          <span className={accentColor}>{label}</span>
        </label>
      ) : null}
      <div className="relative flex items-center rounded-2xl border border-white/15 bg-card/80 px-4 py-3 shadow-lg backdrop-blur-md focus-within:border-primary">
        <Search className="size-4 shrink-0 text-muted-foreground mr-2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          placeholder={placeholder}
          aria-label={label || placeholder}
          className="w-full bg-transparent text-sm text-white placeholder:text-muted-foreground outline-none"
        />
        {loading && <Loader2 className="size-4 shrink-0 animate-spin text-primary" />}
        {query && !loading && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              setOpen(false);
            }}
            className="text-muted-foreground hover:text-white"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-white/20 bg-card/95 p-2 shadow-2xl backdrop-blur-xl">
          {results.map((c) => (
            <li key={`${c.id}-${c.name}`}>
              <button
                type="button"
                onClick={() => {
                  onSelectCity(c);
                  setQuery("");
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-secondary/80"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{c.emoji ?? "📍"}</span>
                  <div>
                    <span className="font-semibold text-white">{c.name}</span>
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {c.state ? `${c.state}, ` : ""}
                      {c.country}
                    </span>
                  </div>
                </div>
                {c.population ? (
                  <span className="text-[11px] text-muted-foreground">
                    pop. {(c.population / 1000).toFixed(0)}k
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SelectedCityCard({
  title,
  badgeText,
  badgeColor,
  city,
  onRemove,
  onAddToTrip,
  isAdded,
}: {
  title?: string;
  badgeText: string;
  badgeColor: string;
  city: CityDetail;
  onRemove?: () => void;
  onAddToTrip?: () => void;
  isAdded?: boolean;
}) {
  return (
    <article className="overflow-hidden rounded-3xl border border-white/15 bg-card/85 shadow-2xl backdrop-blur-xl transition-all duration-300">
      {/* City cover photo */}
      <div className="relative h-52 w-full overflow-hidden bg-secondary/40">
        {city.image_url ? (
          <img
            src={city.image_url}
            alt={city.name}
            className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80";
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-950/40 via-blue-950/30 to-background/50">
            <Compass className="size-12 text-primary/40" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-md ${badgeColor}`}
          >
            {badgeText}
          </span>
          {onRemove && (
            <button
              onClick={onRemove}
              className="rounded-full bg-black/60 p-1.5 text-gray-300 backdrop-blur-md transition hover:bg-black/80 hover:text-white"
              title="Change city"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Bottom overlay in image */}
        <div className="absolute bottom-3 left-4 right-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{city.emoji ?? "📍"}</span>
            <h3 className="font-display text-2xl font-extrabold text-white">{city.name}</h3>
          </div>
          <p className="mt-0.5 text-xs text-gray-300">
            {city.state ? `${city.state}, ` : ""}
            {city.country}
          </p>
        </div>
      </div>

      {/* City Information Body */}
      <div className="p-5">
        {/* About the city */}
        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
            <Info className="size-3.5" />
            About {city.name}
          </h4>
          <p className="mt-2 text-xs leading-relaxed text-gray-300">
            {city.description ||
              `${city.name} is a vibrant destination in ${city.country}, offering unforgettable culture, landmarks, and memorable experiences.`}
          </p>
        </div>

        {/* City Stats Badges (Cost Index removed per user request) */}
        <dl className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {city.population ? (
            <div className="rounded-xl border border-white/5 bg-secondary/50 p-2.5">
              <dt className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <Users className="size-3 text-primary" />
                Population
              </dt>
              <dd className="mt-1 text-xs font-semibold text-white">
                {city.population.toLocaleString()}
              </dd>
            </div>
          ) : null}

          {city.latitude && city.longitude ? (
            <div className="rounded-xl border border-white/5 bg-secondary/50 p-2.5">
              <dt className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <MapPin className="size-3 text-accent" />
                Coords
              </dt>
              <dd className="mt-1 text-xs font-semibold text-white">
                {Number(city.latitude).toFixed(2)}°, {Number(city.longitude).toFixed(2)}°
              </dd>
            </div>
          ) : null}

          {city.timezone ? (
            <div className="rounded-xl border border-white/5 bg-secondary/50 p-2.5">
              <dt className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <Compass className="size-3 text-primary" />
                Timezone
              </dt>
              <dd className="mt-1 truncate text-xs font-semibold text-white">
                {city.timezone.split("/")[1]?.replace("_", " ") ?? city.timezone}
              </dd>
            </div>
          ) : null}
        </dl>

        {/* Add button if handler provided */}
        {onAddToTrip && (
          <div className="mt-4 border-t border-border/40 pt-3">
            <button
              onClick={onAddToTrip}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-xs font-bold uppercase tracking-wider transition ${
                isAdded
                  ? "border border-primary/50 bg-primary/20 text-primary"
                  : "gradient-sunset text-primary-foreground shadow-lift hover:opacity-90"
              }`}
            >
              {isAdded ? (
                <>
                  <Check className="size-4" /> Added to Trip Route
                </>
              ) : (
                <>
                  <Plus className="size-4" /> Add Destination to Trip
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function CitiesPage() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [tripId, setTripId] = useState<number | null>(null);
  const [stops, setStops] = useState<StoredStop[]>([]);

  // Journey route states
  const [startCity, setStartCity] = useState<CityDetail | null>(null);
  const [viaStops, setViaStops] = useState<{ id: string; city: CityDetail | null }[]>([]);
  const [stopCity, setStopCity] = useState<CityDetail | null>(null);

  // Active showcase for inspected/clicked city
  const [showcaseCity, setShowcaseCity] = useState<CityDetail | null>(null);

  // Loading states
  const [loadingStart, setLoadingStart] = useState(false);
  const [loadingStop, setLoadingStop] = useState(false);

  // Explore search state
  const [exploreQuery, setExploreQuery] = useState("");
  const [exploreResults, setExploreResults] = useState<GeoCitySearchResult[]>([]);
  const [exploreLoading, setExploreLoading] = useState(false);

  // Load trips
  useEffect(() => {
    if (USE_FAKE_DATA) {
      const list = loadTrips();
      setTrips(list);
      if (list.length) setTripId(list[0]!.id);
      return;
    }
    getMyTrips()
      .then((res) => {
        setTrips(res.data);
        if (res.data.length) setTripId(res.data[0]!.id);
      })
      .catch(() => {
        const list = loadTrips();
        setTrips(list);
        if (list.length) setTripId(list[0]!.id);
      });
  }, []);

  // Load stops for selected trip
  useEffect(() => {
    if (tripId != null) {
      const s = loadStops(tripId);
      setStops(s);
    }
  }, [tripId]);

  const trip = trips.find((t) => t.id === tripId) ?? null;

  // Handle selecting Start City
  async function handleSelectStart(city: GeoCitySearchResult) {
    setLoadingStart(true);
    try {
      const res = await getCityDetails(city.name, city.country, city.state ?? undefined, city.id);
      setStartCity(res.data);
      setShowcaseCity(res.data);
      autoSyncCityToTrip(res.data, "start");
    } catch {
      const fallback: CityDetail = {
        id: city.id,
        name: city.name,
        state: city.state,
        country: city.country,
        country_code: city.country_code,
        emoji: city.emoji,
        latitude: city.latitude,
        longitude: city.longitude,
        population: city.population,
        timezone: city.timezone,
        cost_index: 5,
        popularity: 7,
        image_url:
          "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80",
        description: `${city.name} is a premier destination in ${city.country}.`,
      };
      setStartCity(fallback);
      setShowcaseCity(fallback);
      autoSyncCityToTrip(fallback, "start");
    } finally {
      setLoadingStart(false);
    }
  }

  // Handle selecting an Intermediate Stop
  async function handleSelectVia(index: number, city: GeoCitySearchResult) {
    try {
      const res = await getCityDetails(city.name, city.country, city.state ?? undefined, city.id);
      setViaStops((prev) => {
        const next = [...prev];
        next[index] = { ...next[index]!, city: res.data };
        return next;
      });
      setShowcaseCity(res.data);
      autoSyncCityToTrip(res.data, "via");
    } catch {
      const fallback: CityDetail = {
        id: city.id,
        name: city.name,
        state: city.state,
        country: city.country,
        country_code: city.country_code,
        emoji: city.emoji,
        latitude: city.latitude,
        longitude: city.longitude,
        population: city.population,
        timezone: city.timezone,
        cost_index: 5,
        popularity: 7,
        image_url:
          "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80",
        description: `${city.name} is a premier destination in ${city.country}.`,
      };
      setViaStops((prev) => {
        const next = [...prev];
        next[index] = { ...next[index]!, city: fallback };
        return next;
      });
      setShowcaseCity(fallback);
      autoSyncCityToTrip(fallback, "via");
    }
  }

  // Add a new empty intermediate stop slot
  function addIntermediateStopSlot() {
    setViaStops((prev) => [
      ...prev,
      { id: `stop-slot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, city: null },
    ]);
  }

  // Remove an intermediate stop slot
  function removeIntermediateStop(index: number) {
    const removed = viaStops[index];
    setViaStops((prev) => prev.filter((_, i) => i !== index));
    if (removed?.city && tripId != null) {
      removeStopByName(removed.city.name);
    }
  }

  // Handle selecting Final Destination (Stop City)
  async function handleSelectStop(city: GeoCitySearchResult) {
    setLoadingStop(true);
    try {
      const res = await getCityDetails(city.name, city.country, city.state ?? undefined, city.id);
      setStopCity(res.data);
      setShowcaseCity(res.data);
      autoSyncCityToTrip(res.data, "stop");
    } catch {
      const fallback: CityDetail = {
        id: city.id,
        name: city.name,
        state: city.state,
        country: city.country,
        country_code: city.country_code,
        emoji: city.emoji,
        latitude: city.latitude,
        longitude: city.longitude,
        population: city.population,
        timezone: city.timezone,
        cost_index: 5,
        popularity: 7,
        image_url:
          "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80",
        description: `${city.name} is a premier destination in ${city.country}.`,
      };
      setStopCity(fallback);
      setShowcaseCity(fallback);
      autoSyncCityToTrip(fallback, "stop");
    } finally {
      setLoadingStop(false);
    }
  }

  // Auto-sync a selected city into the trip's destination store
  function autoSyncCityToTrip(detail: CityDetail, _role: string) {
    if (tripId == null || !trip) return;

    const currentStops = loadStops(tripId);
    if (currentStops.some((s) => s.city.name.toLowerCase() === detail.name.toLowerCase())) {
      return;
    }

    const cityObj: City = {
      id: detail.id ?? Math.floor(Math.random() * 1000000) + 100,
      name: detail.name,
      country: detail.country,
      cost_index: 5,
      popularity: 7,
      region: detail.state ?? detail.country,
    };

    const next: StoredStop[] = [
      ...currentStops,
      {
        id: newStopId(),
        city: cityObj,
        start_date: trip.start_date,
        end_date: trip.end_date,
        activity_ids: [],
      },
    ];

    setStops(next);
    saveStops(tripId, next);
    toast.success(`${detail.name} added to ${trip.name} destinations!`);
  }

  // Remove stop by name
  function removeStopByName(cityName: string) {
    if (tripId == null) return;
    const next = stops.filter((s) => s.city.name.toLowerCase() !== cityName.toLowerCase());
    setStops(next);
    saveStops(tripId, next);
  }

  // Helper to add a single city explicitly
  function addCityToTrip(detail: CityDetail) {
    if (tripId == null || !trip) {
      toast.error("Please select a trip first");
      return;
    }
    autoSyncCityToTrip(detail, "custom");
  }

  // Save the full sequential route into the trip
  function saveEntireRouteToTrip() {
    if (tripId == null || !trip) {
      toast.error("Please select a trip first");
      return;
    }

    const routeCities: CityDetail[] = [];
    if (startCity) routeCities.push(startCity);
    viaStops.forEach((v) => {
      if (v.city) routeCities.push(v.city);
    });
    if (stopCity) routeCities.push(stopCity);

    if (routeCities.length === 0) {
      toast.error("Please select at least one city first");
      return;
    }

    const nextStops: StoredStop[] = [];
    routeCities.forEach((c) => {
      nextStops.push({
        id: newStopId(),
        city: {
          id: c.id ?? Math.floor(Math.random() * 1000000) + 101,
          name: c.name,
          country: c.country,
          cost_index: 5,
          popularity: 7,
          region: c.state ?? c.country,
        },
        start_date: trip.start_date,
        end_date: trip.end_date,
        activity_ids: [],
      });
    });

    setStops(nextStops);
    saveStops(tripId, nextStops);
    toast.success(`Full route saved to ${trip.name}! (${nextStops.length} destinations)`);
  }

  // Remove stop from trip list
  function removeStop(stopId: string) {
    if (tripId == null) return;
    const next = stops.filter((s) => s.id !== stopId);
    setStops(next);
    saveStops(tripId, next);
    toast.success("Destination removed from trip");
  }

  // Click handler when user clicks a city in the right sidebar list
  async function handleSidebarCityClick(s: StoredStop) {
    try {
      const res = await getCityDetails(s.city.name, s.city.country);
      setShowcaseCity(res.data);
    } catch {
      setShowcaseCity({
        id: s.city.id,
        name: s.city.name,
        country: s.city.country,
        state: s.city.region,
        cost_index: 5,
        popularity: 7,
        image_url:
          "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80",
        description: `${s.city.name} is a key destination in ${s.city.country}.`,
      });
    }

    // Smooth scroll to top of showcase on mobile/smaller screens
    window.scrollTo({ top: 120, behavior: "smooth" });
  }

  // Sequence of all planned journey legs for distance
  const journeySequence = useMemo(() => {
    const list: CityDetail[] = [];
    if (startCity) list.push(startCity);
    viaStops.forEach((v) => {
      if (v.city) list.push(v.city);
    });
    if (stopCity) list.push(stopCity);
    return list;
  }, [startCity, viaStops, stopCity]);

  // Calculate total route distance
  const totalDistanceKm = useMemo(() => {
    if (journeySequence.length < 2) return null;
    let dist = 0;
    for (let i = 0; i < journeySequence.length - 1; i++) {
      const a = journeySequence[i]!;
      const b = journeySequence[i + 1]!;
      if (a.latitude && a.longitude && b.latitude && b.longitude) {
        dist += calculateDistance(
          Number(a.latitude),
          Number(a.longitude),
          Number(b.latitude),
          Number(b.longitude)
        );
      }
    }
    return dist > 0 ? dist : null;
  }, [journeySequence]);

  // Explore search effect
  useEffect(() => {
    const q = exploreQuery.trim();
    if (q.length < 1) {
      setExploreResults([]);
      setExploreLoading(false);
      return;
    }
    setExploreLoading(true);
    const timer = setTimeout(() => {
      searchGeoCities(q, 12)
        .then((res) => setExploreResults(res.data))
        .catch(() => setExploreResults([]))
        .finally(() => setExploreLoading(false));
    }, 200);
    return () => clearTimeout(timer);
  }, [exploreQuery]);

  const addedCityNames = new Set(stops.map((s) => s.city.name.toLowerCase()));

  return (
    <div className="min-h-screen bg-transparent">
      <Navbar />

      <main className="mx-auto max-w-7xl px-5 py-10">
        {/* Page Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
              Journey Route & Destinations
            </p>
            <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">
              Explore <span className="text-gradient-sunset">Cities</span>
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Search over 150,000 cities worldwide. Plan your route from Departure through intermediate
              stops to your Final Destination, and explore authentic travel guides.
            </p>
          </div>

          {/* Active Trip Indicator */}
          {trip && (
            <div className="rounded-2xl border border-white/10 bg-card/70 p-4 backdrop-blur-md">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Active Trip
              </span>
              <p className="font-display text-lg font-bold capitalize text-white">{trip.name}</p>
              <p className="text-xs text-primary">
                {stops.length} {stops.length === 1 ? "destination" : "destinations"} planned
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="space-y-10">
            {/* SECTION: Sequential Journey Route Planner */}
            <section className="rounded-3xl border border-white/15 bg-card/60 p-6 shadow-2xl backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
                    <Navigation className="size-5 text-primary" />
                    Plan Journey Route
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Set your Start city, add intermediate stops en route, and pick your Final Destination.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={addIntermediateStopSlot}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary transition hover:bg-primary hover:text-primary-foreground"
                  >
                    <Plus className="size-4" />
                    Add Stop
                  </button>

                  {journeySequence.length > 0 && (
                    <button
                      onClick={saveEntireRouteToTrip}
                      className="gradient-sunset inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lift transition hover:opacity-95"
                    >
                      <Check className="size-4" />
                      Save Route
                    </button>
                  )}
                </div>
              </div>

              {/* Journey Route Nodes */}
              <div className="mt-6 space-y-6">
                {/* 1. START CITY */}
                <div className="relative rounded-2xl border border-emerald-500/20 bg-card/75 p-5 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
                        A
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        Start City (Departure / Origin)
                      </span>
                    </div>
                    {startCity && (
                      <button
                        onClick={() => setStartCity(null)}
                        className="text-xs text-muted-foreground hover:text-white underline"
                      >
                        Change
                      </button>
                    )}
                  </div>

                  <div className="mt-3">
                    {!startCity ? (
                      <CitySearchInput
                        label=""
                        placeholder="Search departure city (e.g. Delhi, London, Zurich...)"
                        accentColor="text-emerald-400"
                        onSelectCity={handleSelectStart}
                      />
                    ) : (
                      <SelectedCityCard
                        badgeText="Departure / Origin"
                        badgeColor="border border-emerald-500/40 bg-emerald-950/60 text-emerald-300"
                        city={startCity}
                        onRemove={() => setStartCity(null)}
                        onAddToTrip={() => addCityToTrip(startCity)}
                        isAdded={addedCityNames.has(startCity.name.toLowerCase())}
                      />
                    )}
                  </div>
                </div>

                {/* 2. INTERMEDIATE STOPS (VIA / WAYPOINTS) */}
                {viaStops.map((via, idx) => (
                  <div
                    key={via.id}
                    className="relative rounded-2xl border border-amber-500/20 bg-card/75 p-5 shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex size-6 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-400">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                          Stop {idx + 1} (En Route / Mid-Way)
                        </span>
                      </div>
                      <button
                        onClick={() => removeIntermediateStop(idx)}
                        className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"
                      >
                        <Trash2 className="size-3.5" />
                        Remove Stop
                      </button>
                    </div>

                    <div className="mt-3">
                      {!via.city ? (
                        <CitySearchInput
                          label=""
                          placeholder="Search intermediate stop (e.g. Kasol, Tosh, Chandigarh...)"
                          accentColor="text-amber-400"
                          onSelectCity={(c) => handleSelectVia(idx, c)}
                        />
                      ) : (
                        <SelectedCityCard
                          badgeText={`Stop ${idx + 1} En Route`}
                          badgeColor="border border-amber-500/40 bg-amber-950/60 text-amber-300"
                          city={via.city}
                          onRemove={() => {
                            setViaStops((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx]!, city: null };
                              return next;
                            });
                          }}
                          onAddToTrip={() => addCityToTrip(via.city!)}
                          isAdded={addedCityNames.has(via.city.name.toLowerCase())}
                        />
                      )}
                    </div>
                  </div>
                ))}

                {/* Add Stop Button Bar */}
                <div className="flex justify-center py-1">
                  <button
                    onClick={addIntermediateStopSlot}
                    className="inline-flex items-center gap-2 rounded-full border border-dashed border-white/25 bg-secondary/40 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-300 transition hover:border-primary hover:bg-secondary/70 hover:text-white"
                  >
                    <Plus className="size-4 text-primary" />
                    + Add Another Stop (En Route)
                  </button>
                </div>

                {/* 3. FINAL DESTINATION */}
                <div className="relative rounded-2xl border border-rose-500/20 bg-card/75 p-5 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 items-center justify-center rounded-full bg-rose-500/20 text-xs font-bold text-rose-400">
                        B
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                        Final Destination (Arrival)
                      </span>
                    </div>
                    {stopCity && (
                      <button
                        onClick={() => setStopCity(null)}
                        className="text-xs text-muted-foreground hover:text-white underline"
                      >
                        Change
                      </button>
                    )}
                  </div>

                  <div className="mt-3">
                    {!stopCity ? (
                      <CitySearchInput
                        label=""
                        placeholder="Search final destination (e.g. Manali, Paris, Tokyo...)"
                        accentColor="text-rose-400"
                        onSelectCity={handleSelectStop}
                      />
                    ) : (
                      <SelectedCityCard
                        badgeText="Final Destination"
                        badgeColor="border border-rose-500/40 bg-rose-950/60 text-rose-300"
                        city={stopCity}
                        onRemove={() => setStopCity(null)}
                        onAddToTrip={() => addCityToTrip(stopCity)}
                        isAdded={addedCityNames.has(stopCity.name.toLowerCase())}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Connected Route Summary Bar */}
              {journeySequence.length >= 2 && (
                <div className="mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-4 backdrop-blur-md">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
                      {journeySequence.map((c, i) => (
                        <span key={`${c.name}-${i}`} className="flex items-center gap-1.5">
                          <span className="text-primary">{c.name}</span>
                          {i < journeySequence.length - 1 && (
                            <ArrowRight className="size-4 text-muted-foreground" />
                          )}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-4">
                      {totalDistanceKm && (
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Estimated Distance
                          </p>
                          <p className="text-sm font-extrabold text-primary">
                            ~{totalDistanceKm.toLocaleString()} km
                          </p>
                        </div>
                      )}
                      <button
                        onClick={saveEntireRouteToTrip}
                        className="gradient-sunset inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lift transition hover:opacity-95"
                      >
                        <Check className="size-3.5" />
                        Sync to {trip?.name ?? "Trip"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* SECTION: Global City Explorer */}
            <section className="rounded-3xl border border-white/10 bg-card/50 p-6 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-border/40 pb-4">
                <div>
                  <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                    <Globe2 className="size-4 text-accent" />
                    Explore Any Global City
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Search over 150,000 cities, states, or countries across 250 regions in the database.
                  </p>
                </div>
              </div>

              <div className="mt-5 relative">
                <div className="relative flex items-center rounded-2xl border border-white/15 bg-card/80 px-4 py-3 shadow-lg focus-within:border-accent">
                  <Search className="size-4 shrink-0 text-muted-foreground mr-2" />
                  <input
                    value={exploreQuery}
                    onChange={(e) => setExploreQuery(e.target.value)}
                    placeholder="Search by city, state or country (e.g. Kasol, Manali, Switzerland, Japan...)"
                    className="w-full bg-transparent text-sm text-white placeholder:text-muted-foreground outline-none"
                  />
                  {exploreLoading && <Loader2 className="size-4 shrink-0 animate-spin text-accent" />}
                  {exploreQuery && !exploreLoading && (
                    <button onClick={() => setExploreQuery("")} className="text-muted-foreground hover:text-white">
                      <X className="size-4" />
                    </button>
                  )}
                </div>

                {/* Explore Results Grid */}
                {exploreResults.length > 0 && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-h-96 overflow-y-auto p-1">
                    {exploreResults.map((c) => (
                      <div
                        key={`${c.id}-${c.name}`}
                        className="flex flex-col justify-between rounded-2xl border border-white/10 bg-card/70 p-4 transition hover:border-primary/40 hover:bg-secondary/40"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{c.emoji ?? "📍"}</span>
                            <div>
                              <h4 className="font-semibold text-white">{c.name}</h4>
                              <p className="text-xs text-muted-foreground">
                                {c.state ? `${c.state}, ` : ""}
                                {c.country}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2.5">
                          <button
                            onClick={async () => {
                              try {
                                const res = await getCityDetails(
                                  c.name,
                                  c.country,
                                  c.state ?? undefined,
                                  c.id
                                );
                                setShowcaseCity(res.data);
                              } catch {
                                setShowcaseCity({
                                  id: c.id,
                                  name: c.name,
                                  country: c.country,
                                  state: c.state,
                                  cost_index: 5,
                                  popularity: 7,
                                  image_url:
                                    "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80",
                                  description: `${c.name} is a premier destination in ${c.country}.`,
                                });
                              }
                              window.scrollTo({ top: 120, behavior: "smooth" });
                            }}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() =>
                              addCityToTrip({
                                id: c.id,
                                name: c.name,
                                country: c.country,
                                state: c.state,
                                cost_index: 5,
                                popularity: 7,
                                image_url: "",
                                description: "",
                              })
                            }
                            className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-white transition hover:bg-primary hover:text-primary-foreground"
                          >
                            + Add
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Showcase preview for inspected city */}
              {showcaseCity && (
                <div className="mt-6 border-t border-white/10 pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1">
                      <Eye className="size-3.5" /> Inspected Destination Showcase
                    </span>
                    <button
                      onClick={() => setShowcaseCity(null)}
                      className="text-xs text-muted-foreground hover:text-white"
                    >
                      Close
                    </button>
                  </div>
                  <SelectedCityCard
                    badgeText="Destination Details"
                    badgeColor="border border-cyan-500/40 bg-cyan-950/60 text-cyan-300"
                    city={showcaseCity}
                    onRemove={() => setShowcaseCity(null)}
                    onAddToTrip={() => addCityToTrip(showcaseCity)}
                    isAdded={addedCityNames.has(showcaseCity.name.toLowerCase())}
                  />
                </div>
              )}
            </section>
          </div>

          {/* RIGHT ASIDE: TRIP SELECTOR & INTERACTIVE DESTINATIONS */}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <TripPicker trips={trips} value={tripId} onChange={setTripId} />

            {/* Clickable Destinations List */}
            <section className="rounded-3xl border border-white/15 bg-card/85 p-5 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="flex items-center gap-2 font-display text-base font-bold text-white">
                  <MapPin className="size-4 text-primary" />
                  {trip?.name ?? "Trip"} Destinations ({stops.length})
                </h3>
                {stops.length > 0 && (
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                    Interactive
                  </span>
                )}
              </div>

              <p className="mt-2 text-[11px] text-muted-foreground">
                Click any city to view its photo and guide, or manage activities.
              </p>

              {stops.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-border/60 p-5 text-center">
                  <p className="text-xs text-muted-foreground">
                    No destinations added yet. Pick a Start & Stop city on the left to begin your journey!
                  </p>
                </div>
              ) : (
                <ol className="mt-4 space-y-2.5">
                  {stops.map((s, i) => (
                    <li
                      key={s.id}
                      className="group relative rounded-2xl border border-white/10 bg-secondary/40 p-3 transition hover:border-primary/50 hover:bg-secondary/70 shadow-sm"
                    >
                      <div
                        onClick={() => void handleSidebarCityClick(s)}
                        className="cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="gradient-sunset flex size-6 items-center justify-center rounded-full text-[11px] font-extrabold text-primary-foreground shadow-sm">
                            {i + 1}
                          </span>
                          <div>
                            <p className="font-semibold text-white group-hover:text-primary transition">
                              {s.city.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {s.city.region ? `${s.city.region}, ` : ""}
                              {s.city.country}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeStop(s.id);
                          }}
                          className="rounded-lg p-1 text-muted-foreground transition hover:bg-destructive/20 hover:text-destructive"
                          title="Remove destination"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>

                      {/* Interactive Quick Links for each destination */}
                      <div className="mt-2.5 flex items-center gap-2 border-t border-white/5 pt-2 text-[11px]">
                        <button
                          onClick={() => void handleSidebarCityClick(s)}
                          className="text-primary hover:underline flex items-center gap-1 font-semibold"
                        >
                          <Eye className="size-3" /> View Card
                        </button>
                        <span className="text-muted-foreground">·</span>
                        <Link
                          to="/activities"
                          className="text-gray-300 hover:text-white flex items-center gap-1"
                        >
                          Activities <ExternalLink className="size-2.5" />
                        </Link>
                        <span className="text-muted-foreground">·</span>
                        <Link
                          to="/itinerary"
                          className="text-gray-300 hover:text-white flex items-center gap-1"
                        >
                          Itinerary <ExternalLink className="size-2.5" />
                        </Link>
                      </div>
                    </li>
                  ))}
                </ol>
              )}

              {/* Action buttons */}
              <div className="mt-5 space-y-2 border-t border-border/40 pt-4">
                <Link
                  to="/trips"
                  className="block w-full rounded-full border border-border/70 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-gray-300 transition hover:bg-secondary hover:text-white"
                >
                  ← Back to My Trips
                </Link>
                <Link
                  to="/itinerary"
                  className="gradient-sunset block w-full rounded-full py-2.5 text-center text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lift transition hover:opacity-95"
                >
                  View Full Itinerary →
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
