import { useEffect, useState, useMemo, Component, type ErrorInfo, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { GlobeMap } from "@/components/GlobeMap";
import { Map2D } from "@/components/Map2D";

interface MapErrorBoundaryProps {
  children: ReactNode;
}

interface MapErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class MapErrorBoundary extends Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
  constructor(props: MapErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("Map view error caught:", error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center bg-slate-950 p-6 text-center text-white">
          <div className="rounded-2xl border border-sky-500/30 bg-slate-900/90 p-6 max-w-md shadow-2xl backdrop-blur-xl">
            <h3 className="text-base font-bold text-white">Map View Reloading</h3>
            <p className="mt-1 text-xs text-gray-300">
              {this.state.error?.message || "An issue occurred initializing the interactive map."}
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-sky-400 transition-all shadow-md"
            >
              Reload Map View
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
import { getActiveTripId, loadTrips, setActiveTripId } from "@/lib/tripStore";
import { getMyTrips } from "@/api/tripsApi";
import { USE_FAKE_DATA } from "@/config";
import {
  loadStops,
  loadReturnJourney,
  saveReturnJourney,
  type StoredStop,
  type ReturnJourneyConfig,
} from "@/lib/itineraryStore";
import { getCityFallbackImage, getCitiesDistanceKm } from "@/lib/cityImageHelper";
import type { TripListItem } from "@/api/types";
import {
  CalendarDays,
  Compass,
  Globe,
  MapPin,
  Navigation,
  Flag,
  ArrowRight,
  ExternalLink,
  PlusCircle,
  Sparkles,
  RotateCcw,
  PlaneTakeoff,
} from "lucide-react";

export const Route = createFileRoute("/itinerary-builder")({
  head: () => ({
    meta: [
      { title: "Trip Route Explorer (3D & 2D) — GlobeTrotter" },
      {
        name: "description",
        content:
          "Explore your travel journey in 3D spherical globe and 2D high-detail street & satellite map with verified country borders and flight routes.",
      },
      { property: "og:title", content: "Trip Route Explorer (3D & 2D) — GlobeTrotter" },
      {
        property: "og:description",
        content:
          "Explore your travel journey in 3D spherical globe and 2D high-detail street & satellite map with verified country borders and flight routes.",
      },
    ],
  }),
  component: BuilderPage,
});

function BuilderPage() {
  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [tripId, setTripId] = useState<number | null>(null);
  const [stops, setStops] = useState<StoredStop[]>([]);
  const [viewMode, setViewMode] = useState<"3d" | "2d">("3d");
  const [returnJourney, setReturnJourney] = useState<ReturnJourneyConfig>({
    enabled: false,
    transportMode: "flight",
    travelHours: 2,
  });
  const [journeyLegTab, setJourneyLegTab] = useState<"going" | "return">("going");

  // Fetch trips from database (getMyTrips API) or local store
  useEffect(() => {
    async function initTrips() {
      let list: TripListItem[] = [];
      if (USE_FAKE_DATA) {
        list = loadTrips();
      } else {
        try {
          const res = await getMyTrips();
          list = res.data;
        } catch {
          list = loadTrips();
        }
      }
      setTrips(list);

      if (list.length > 0) {
        const savedActiveId = getActiveTripId();
        const found = list.find((t) => t.id === savedActiveId);
        const chosenId = found ? found.id : list[0]!.id;
        setTripId(chosenId);
      }
    }

    initTrips();
  }, []);

  // Load stops and return journey whenever tripId changes and persist active trip
  useEffect(() => {
    if (tripId == null) {
      setStops([]);
      setReturnJourney({ enabled: false, transportMode: "flight", travelHours: 2 });
      setJourneyLegTab("going");
      return;
    }
    setActiveTripId(tripId);
    setStops(loadStops(tripId));
    const rj = loadReturnJourney(tripId);
    setReturnJourney(rj);
    if (!rj.enabled) {
      setJourneyLegTab("going");
    }
  }, [tripId]);

  // Listen for return journey changes in other views/tabs
  useEffect(() => {
    function handleReturnUpdated(e: any) {
      if (tripId != null && e.detail?.tripId === tripId) {
        const rj = loadReturnJourney(tripId);
        setReturnJourney(rj);
        if (!rj.enabled) {
          setJourneyLegTab("going");
        }
      }
    }
    window.addEventListener("globetrotter:return-journey-updated", handleReturnUpdated);
    return () => {
      window.removeEventListener("globetrotter:return-journey-updated", handleReturnUpdated);
    };
  }, [tripId]);

  // Compute synthetic single direct return leg from last destination to origin
  const returnStops: StoredStop[] = useMemo(() => {
    if (stops.length < 2) return [];
    const last = stops[stops.length - 1]!;
    const origin = stops[0]!;
    return [
      {
        ...last,
        id: `return_origin_${last.id}`,
      },
      {
        ...origin,
        id: `return_dest_${origin.id}`,
      },
    ];
  }, [stops]);

  const isReturnActive =
    journeyLegTab === "return" && returnJourney.enabled && returnStops.length >= 2;
  const displayedStops = isReturnActive ? returnStops : stops;

  const activeTrip = trips.find((t) => t.id === tripId) ?? null;

  const totalGoingDistanceKm = useMemo(() => {
    if (stops.length < 2) return 0;
    let sum = 0;
    for (let i = 0; i < stops.length - 1; i++) {
      sum += getCitiesDistanceKm(stops[i].city, stops[i + 1].city);
    }
    return sum;
  }, [stops]);

  const returnDirectDistKm = useMemo(() => {
    if (returnStops.length < 2) return 0;
    return getCitiesDistanceKm(returnStops[0].city, returnStops[1].city);
  }, [returnStops]);

  function handleToggleReturnJourney(enabled: boolean) {
    if (tripId == null) return;
    const updated: ReturnJourneyConfig = {
      ...returnJourney,
      enabled,
    };
    setReturnJourney(updated);
    saveReturnJourney(tripId, updated);
    if (!enabled && journeyLegTab === "return") {
      setJourneyLegTab("going");
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#020617] text-white">
      <Navbar />

      {/* Main Container with generous spacing around the map */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-20">
        {/* Top Header Controls Bar: Active Trip Selector + View Mode Switcher */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-slate-950/70 p-4 shadow-xl backdrop-blur-xl">
          {/* Trip Branding / Title */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-400 border border-sky-500/30">
              <Compass className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-sky-400">
                  Route Explorer
                </span>
                {activeTrip && (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-gray-300">
                    {activeTrip.start_date} → {activeTrip.end_date}
                  </span>
                )}
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold text-white">
                {activeTrip ? activeTrip.name : "Select an Active Trip"}
              </h1>
            </div>
          </div>

          {/* Controls: Active Trip Dropdown & 3D / 2D Switcher */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Active Trip Picker */}
            <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-slate-900/90 px-3 py-1.5 shadow-md">
              <label
                htmlFor="trip-select-dropdown"
                className="text-xs font-bold uppercase tracking-wider text-sky-400"
              >
                Trip:
              </label>
              <select
                id="trip-select-dropdown"
                value={tripId ?? ""}
                onChange={(e) => {
                  const newId = Number(e.target.value);
                  setTripId(newId);
                  setActiveTripId(newId);
                }}
                className="rounded-lg border border-white/15 bg-slate-800 px-2.5 py-1 text-xs font-bold text-white outline-none focus:border-sky-400"
              >
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Going / Return Journey Route Switcher (ONLY displayed when Enable Return Journey is ON) */}
            {returnJourney.enabled && (
              <div className="flex items-center rounded-2xl border border-indigo-500/40 bg-slate-900/90 p-1 shadow-md">
                <button
                  type="button"
                  onClick={() => setJourneyLegTab("going")}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                    !isReturnActive
                      ? "bg-sky-500 text-slate-950 shadow-md"
                      : "text-gray-300 hover:text-white"
                  }`}
                  title="View Going Journey Sequence"
                >
                  <PlaneTakeoff className="size-3.5" />
                  <span>Going Route</span>
                </button>
                <button
                  type="button"
                  onClick={() => setJourneyLegTab("return")}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                    isReturnActive
                      ? "bg-indigo-500 text-white shadow-md"
                      : "text-gray-300 hover:text-white"
                  }`}
                  title="View Direct Return Transit Leg"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Return Route (Direct)</span>
                </button>
              </div>
            )}

            {/* View Mode Toggle: [ 🌍 3D Globe | 🗺️ 2D Map ] */}
            <div className="flex items-center rounded-2xl border border-white/15 bg-slate-900/90 p-1 shadow-md">
              <button
                type="button"
                onClick={() => setViewMode("3d")}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  viewMode === "3d"
                    ? "bg-sky-500 text-slate-950 shadow-md"
                    : "text-gray-300 hover:text-white"
                }`}
                title="Switch to 3D World Globe"
              >
                <Globe className="size-3.5" />
                <span>3D Globe</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("2d")}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  viewMode === "2d"
                    ? "bg-sky-500 text-slate-950 shadow-md"
                    : "text-gray-300 hover:text-white"
                }`}
                title="Switch to 2D Route Map"
              >
                <MapPin className="size-3.5" />
                <span>2D Map</span>
              </button>
            </div>

            {/* Cross-page Navigation Links */}
            <div className="flex items-center gap-2">
              <Link
                to="/cities"
                className="flex items-center gap-1.5 rounded-2xl border border-white/15 bg-slate-900/90 px-3 py-1.5 text-xs font-bold text-gray-300 transition hover:border-sky-400 hover:text-white shadow-md"
                title="Open Cities & Route Builder"
              >
                <MapPin className="size-3.5 text-sky-400" />
                <span>Cities</span>
              </Link>
              <Link
                to="/itinerary"
                className="flex items-center gap-1.5 rounded-2xl border border-sky-500/30 bg-sky-500/15 px-3 py-1.5 text-xs font-bold text-sky-300 transition hover:bg-sky-500/25 shadow-md"
                title="Open Detailed Daily Itinerary Plan"
              >
                <CalendarDays className="size-3.5" />
                <span>Itinerary Plan</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Map Viewport Card Frame (with generous space/margins around it) */}
        <div className="relative h-[720px] sm:h-[760px] w-full rounded-3xl border border-white/15 bg-slate-950/80 shadow-2xl backdrop-blur-xl overflow-hidden">
          <MapErrorBoundary>
            <div className={`h-full w-full ${viewMode === "3d" ? "block" : "hidden"}`}>
              <GlobeMap
                stops={displayedStops}
                tripName={
                  isReturnActive
                    ? `${activeTrip?.name ?? "Trip"} (Return Direct)`
                    : activeTrip?.name
                }
                tripDates={
                  activeTrip
                    ? `${activeTrip.start_date} → ${activeTrip.end_date}`
                    : undefined
                }
                onSwitchTo2D={() => setViewMode("2d")}
                isActive={viewMode === "3d"}
              />
            </div>
            <div className={`h-full w-full ${viewMode === "2d" ? "block" : "hidden"}`}>
              <Map2D
                stops={displayedStops}
                tripName={
                  isReturnActive
                    ? `${activeTrip?.name ?? "Trip"} (Return Direct)`
                    : activeTrip?.name
                }
                tripDates={
                  activeTrip
                    ? `${activeTrip.start_date} → ${activeTrip.end_date}`
                    : undefined
                }
                onSwitchTo3D={() => setViewMode("3d")}
                isActive={viewMode === "2d"}
              />
            </div>
          </MapErrorBoundary>
        </div>

        {/* Page Scroll Section Below the Map */}
        <div className="mt-12 space-y-12">
          {/* 1. Going Journey Route Section */}
          <section className="space-y-6">
            {/* Section Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
                  <Navigation className="size-5 text-sky-400" />
                  <span>Going Journey Route</span>
                  {stops.length > 0 && (
                    <span className="ml-1 rounded-full border border-sky-500/40 bg-sky-500/15 px-3 py-0.5 text-xs font-bold text-sky-300">
                      {stops.length} {stops.length === 1 ? "City" : "Cities"}
                    </span>
                  )}
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-gray-400">
                  Sequential transit sequence from your Home City (Departure) 🟢 to your Final Destination 🔴 with intermediate stops.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {totalGoingDistanceKm > 0 && (
                  <div className="flex items-center gap-2 rounded-2xl border border-sky-500/30 bg-sky-950/70 px-4 py-2 text-xs font-bold text-sky-300 shadow-lg">
                    <span className="text-gray-300 font-medium">Total Going Distance:</span>
                    <span className="text-white font-extrabold text-sm">~{totalGoingDistanceKm.toLocaleString()} km</span>
                  </div>
                )}
                <Link
                  to="/cities"
                  className="inline-flex items-center gap-2 rounded-2xl border border-sky-500/30 bg-sky-500/15 px-4 py-2 text-xs font-bold text-sky-400 transition hover:bg-sky-500/25 shadow-md"
                >
                  <PlusCircle className="size-4" />
                  <span>Customize in Cities</span>
                </Link>
              </div>
            </div>

            {/* Sequence Flow with Arrows and Distances */}
            {stops.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/20 bg-slate-950/40 p-12 text-center">
                <Compass className="mx-auto size-12 text-sky-400/60" />
                <h3 className="mt-4 text-base font-bold text-white">
                  No custom stops configured yet for {activeTrip?.name || "this trip"}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-gray-400 max-w-md mx-auto">
                  Use the Cities & Route Builder to search cities across the world, add intermediate stops, and save your journey sequence.
                </p>
                <Link
                  to="/cities"
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-sky-500 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-950 shadow-lg transition hover:bg-sky-400"
                >
                  <PlusCircle className="size-4" />
                  Add Destinations in Cities
                </Link>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row flex-wrap items-center justify-start gap-4 sm:gap-3 overflow-x-auto pb-4 pt-2">
                {stops.map((stop, idx) => {
                  const isOrigin = idx === 0;
                  const isDest = idx === stops.length - 1 && stops.length > 1;
                  const roleText = isOrigin
                    ? "Home City (Departure)"
                    : isDest
                    ? "Final Destination"
                    : `Stop #${idx}`;
                  const symbol: "🟢" | "🔴" | "📍" = isOrigin ? "🟢" : isDest ? "🔴" : "📍";
                  const badgeClass = isOrigin
                    ? "border-emerald-500/40 bg-emerald-950/80 text-emerald-300"
                    : isDest
                    ? "border-rose-500/40 bg-rose-950/80 text-rose-300"
                    : "border-sky-500/40 bg-sky-950/80 text-sky-300";
                  const borderClass = isOrigin
                    ? "border-emerald-500/40"
                    : isDest
                    ? "border-rose-500/40"
                    : "border-sky-500/30";

                  return (
                    <div
                      key={stop.id || `stop-${idx}`}
                      className="flex flex-col lg:flex-row items-center gap-4 sm:gap-3 w-full lg:w-auto"
                    >
                      <BuilderCityCard
                        city={stop.city}
                        role={roleText}
                        symbol={symbol}
                        badgeClass={badgeClass}
                        borderClass={borderClass}
                        dates={{ start: stop.start_date, end: stop.end_date }}
                        stepLabel={
                          isOrigin
                            ? "Departure"
                            : isDest
                            ? "Final Dest"
                            : `Waypoint #${idx}`
                        }
                      />
                      {idx < stops.length - 1 && (
                        <RouteLegArrow
                          fromCity={stop.city}
                          toCity={stops[idx + 1].city}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 2. Return Journey Route Section */}
          <section className="space-y-6">
            {/* Section Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-indigo-500/20 pb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
                  <RotateCcw className="size-5 text-indigo-400" />
                  <span>Return Journey Route</span>
                  <span
                    className={`ml-1 rounded-full border px-3 py-0.5 text-xs font-bold ${
                      returnJourney.enabled
                        ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-300"
                        : "border-gray-600/40 bg-gray-600/15 text-gray-400"
                    }`}
                  >
                    {returnJourney.enabled ? "Enabled (Direct Segment)" : "Disabled"}
                  </span>
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-gray-400">
                  Single direct non-stop return transit from your Final Destination 🔴 back to your Home City (Departure) 🟢.
                </p>
              </div>

              {/* Action: Toggle Return Journey State */}
              <button
                type="button"
                onClick={() => handleToggleReturnJourney(!returnJourney.enabled)}
                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-bold transition shadow-md ${
                  returnJourney.enabled
                    ? "border-indigo-500/40 bg-indigo-600 text-white hover:bg-indigo-500"
                    : "border-white/20 bg-white/10 text-gray-200 hover:bg-white/20 hover:text-white"
                }`}
              >
                <RotateCcw className="size-4" />
                <span>{returnJourney.enabled ? "Disable Return Journey" : "Enable Return Journey"}</span>
              </button>
            </div>

            {/* Return Journey Details / Card */}
            {returnJourney.enabled ? (
              returnStops.length >= 2 ? (
                <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/30 via-slate-950/70 to-indigo-950/20 p-6 shadow-2xl backdrop-blur-xl">
                  <div className="flex flex-col lg:flex-row flex-wrap items-center justify-center gap-6 sm:gap-4 overflow-x-auto pb-2">
                    {/* Return Origin Card (Final Destination) */}
                    <BuilderCityCard
                      city={returnStops[0].city}
                      role="Return Origin (Final Destination)"
                      symbol="🔴"
                      badgeClass="border-rose-500/40 bg-rose-950/80 text-rose-300"
                      borderClass="border-rose-500/40"
                      stepLabel="Return Departure"
                    />

                    {/* Arrow with distance between Return Origin and Return Arrival */}
                    <RouteLegArrow
                      fromCity={returnStops[0].city}
                      toCity={returnStops[1].city}
                      label="Direct Non-Stop Return"
                    />

                    {/* Return Destination Card (Home City Departure) */}
                    <BuilderCityCard
                      city={returnStops[1].city}
                      role="Return Destination (Home City)"
                      symbol="🟢"
                      badgeClass="border-emerald-500/40 bg-emerald-950/80 text-emerald-300"
                      borderClass="border-emerald-500/40"
                      stepLabel="Return Arrival"
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-indigo-500/30 bg-slate-950/40 p-8 text-center text-gray-400 text-xs sm:text-sm">
                  Please configure at least a Home City and a Final Destination in the Going journey to calculate the direct return route.
                </div>
              )
            ) : (
              <div className="rounded-3xl border border-dashed border-white/15 bg-slate-950/50 p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
                <div className="space-y-1.5 text-center sm:text-left">
                  <h4 className="text-sm sm:text-base font-bold text-white flex items-center justify-center sm:justify-start gap-2">
                    <RotateCcw className="size-4 text-indigo-400" />
                    <span>Return Journey is currently disabled</span>
                  </h4>
                  <p className="text-xs text-gray-400 max-w-xl">
                    Turn on Return Journey to plot the direct return transit from your Final Destination back to your Home City, view the route distance, and display the return segment on both the 3D Globe and 2D Map.
                  </p>
                  {stops.length >= 2 && (
                    <div className="flex items-center justify-center sm:justify-start gap-2 pt-1 text-xs font-semibold text-indigo-300">
                      <span>Preview:</span>
                      <span className="text-rose-400">🔴 {stops[stops.length - 1].city.name}</span>
                      <span>➔</span>
                      <span className="rounded-full bg-indigo-950 border border-indigo-500/30 px-2 py-0.5 text-[11px] text-white">
                        ~{getCitiesDistanceKm(stops[stops.length - 1].city, stops[0].city).toLocaleString()} km
                      </span>
                      <span>➔</span>
                      <span className="text-emerald-400">🟢 {stops[0].city.name}</span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleReturnJourney(true)}
                  className="rounded-2xl border border-indigo-500/40 bg-indigo-600/90 hover:bg-indigo-500 px-5 py-2.5 text-xs font-bold text-white transition shadow-lg shrink-0 flex items-center gap-2"
                >
                  <RotateCcw className="size-4" />
                  <span>Turn On Return Journey</span>
                </button>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

{/* Subcomponent: Reusable City Card for Builder Sequence */}
function BuilderCityCard({
  city,
  role,
  symbol,
  badgeClass,
  borderClass,
  dates,
  stepLabel,
}: {
  city: StoredStop["city"];
  role: string;
  symbol: "🟢" | "🔴" | "📍";
  badgeClass: string;
  borderClass: string;
  dates?: { start?: string; end?: string };
  stepLabel?: string;
}) {
  const fallback = getCityFallbackImage(city.name, city.country);
  const [imgSrc, setImgSrc] = useState(city.image_url || fallback);

  useEffect(() => {
    setImgSrc(city.image_url || getCityFallbackImage(city.name, city.country));
  }, [city.image_url, city.name, city.country]);

  return (
    <div
      className={`relative flex flex-col w-full sm:w-72 overflow-hidden rounded-3xl border ${borderClass} bg-slate-950/80 shadow-2xl backdrop-blur-xl transition hover:shadow-sky-500/10 hover:border-opacity-100 shrink-0`}
    >
      {/* City Cover Image */}
      <div className="relative h-36 w-full overflow-hidden bg-slate-900">
        <img
          src={imgSrc}
          alt={city.name}
          onError={() => setImgSrc(fallback)}
          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

        {/* Floating Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-extrabold tracking-wide backdrop-blur-md shadow-md ${badgeClass}`}
          >
            <span>{symbol}</span>
            <span>{role}</span>
          </span>
          {stepLabel && (
            <span className="rounded-full bg-black/60 backdrop-blur-md border border-white/20 px-2 py-0.5 text-[10px] font-bold text-white shrink-0">
              {stepLabel}
            </span>
          )}
        </div>
      </div>

      {/* City Information */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-lg font-bold text-white tracking-tight">{city.name}</h3>
        <p className="text-xs text-gray-400">
          {city.region ? `${city.region}, ` : ""}
          {city.country}
        </p>

        {/* Coordinates and Dates */}
        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-gray-400">
          {city.latitude && city.longitude ? (
            <span className="rounded-lg bg-white/5 border border-white/10 px-2 py-0.5">
              📍 {Number(city.latitude).toFixed(2)}°, {Number(city.longitude).toFixed(2)}°
            </span>
          ) : null}
          {dates?.start && dates?.end && (
            <span className="rounded-lg bg-white/5 border border-white/10 px-2 py-0.5">
              🗓️ {dates.start} → {dates.end}
            </span>
          )}
        </div>

        {city.description && (
          <p className="mt-2.5 text-xs text-gray-300/90 line-clamp-2 leading-relaxed">
            {city.description}
          </p>
        )}
      </div>
    </div>
  );
}

{/* Subcomponent: Route Leg Arrow with Calculated Distance */}
function RouteLegArrow({
  fromCity,
  toCity,
  label,
}: {
  fromCity: StoredStop["city"];
  toCity: StoredStop["city"];
  label?: string;
}) {
  const dist = getCitiesDistanceKm(fromCity, toCity);
  return (
    <div className="flex flex-col items-center justify-center my-3 lg:my-0 lg:px-2 shrink-0">
      {/* Distance Badge on Arrow */}
      <div className="flex items-center gap-1.5 rounded-full border border-sky-500/40 bg-slate-900/95 px-3 py-1 shadow-lg text-sky-300 text-xs font-bold tracking-wide backdrop-blur-md">
        <Navigation className="size-3 text-sky-400 rotate-90" />
        <span>~{dist.toLocaleString()} km</span>
      </div>

      {/* Visual Arrow */}
      <div className="flex items-center justify-center text-sky-400/90 my-1.5">
        {/* Desktop: Horizontal Arrow */}
        <div className="hidden lg:flex items-center">
          <div className="h-0.5 w-10 md:w-14 bg-gradient-to-r from-sky-500/30 via-sky-400 to-sky-500" />
          <ArrowRight className="size-5 -ml-1 text-sky-400 animate-pulse" />
        </div>
        {/* Mobile: Vertical Arrow */}
        <div className="flex lg:hidden flex-col items-center">
          <div className="w-0.5 h-6 bg-gradient-to-b from-sky-500/30 via-sky-400 to-sky-500" />
          <div className="text-sky-400 font-bold text-lg leading-none">↓</div>
        </div>
      </div>

      {label && (
        <span className="text-[10px] text-gray-400 font-semibold tracking-wide">
          {label}
        </span>
      )}
    </div>
  );
}
