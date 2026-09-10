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
  type StoredStop,
  type ReturnJourneyConfig,
} from "@/lib/itineraryStore";
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
        <div className="mt-12 space-y-8">
          {/* Section Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                {isReturnActive ? (
                  <>
                    <RotateCcw className="size-5 text-indigo-400" />
                    <span>Return Journey Route (Single Direct Segment)</span>
                  </>
                ) : (
                  <>
                    <Navigation className="size-5 text-sky-400" />
                    <span>Journey Itinerary & Destination Sequence</span>
                  </>
                )}
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-gray-400">
                {isReturnActive
                  ? "Single direct non-stop return transit from your Final Destination back to your Origin City (0 intermediate stops)."
                  : "Explore each planned waypoint, departure city, and final destination in chronological order."}
              </p>
            </div>
            <Link
              to="/cities"
              className="inline-flex items-center gap-2 rounded-2xl border border-sky-500/30 bg-sky-500/15 px-4 py-2 text-xs font-bold text-sky-400 transition hover:bg-sky-500/25"
            >
              <PlusCircle className="size-4" />
              <span>Customize in Cities Route Builder</span>
            </Link>
          </div>

          {/* Stops Sequence Grid / Return Leg Card */}
          {isReturnActive ? (
            <div className="space-y-6">
              <div className="rounded-3xl border border-indigo-500/40 bg-gradient-to-r from-indigo-950/40 via-slate-950/70 to-indigo-950/20 p-6 shadow-xl backdrop-blur-xl">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-indigo-500/20 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                      <RotateCcw className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Direct Non-Stop Return Leg</h3>
                      <p className="text-xs text-muted-foreground">
                        {returnStops[0]?.city.name} → {returnStops[1]?.city.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-indigo-500/40 bg-indigo-950/80 px-4 py-1.5 text-xs font-bold text-indigo-300">
                    <span>Direct Non-Stop Return</span>
                    <span>·</span>
                    <span className="text-indigo-400/90 font-medium">Excluded from destination count</span>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  {/* Point 1: Return Origin (Final Destination) */}
                  <article className="rounded-2xl border border-rose-500/30 bg-slate-900/60 p-5 shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full border border-rose-500/40 bg-rose-950/60 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-rose-300">
                        From: Return Origin (Final Destination)
                      </span>
                      <span className="text-xs font-bold text-gray-400">Fixed Point 1</span>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-xl font-bold text-white">{returnStops[0]?.city.name}</h4>
                      <p className="text-xs text-gray-400">
                        {returnStops[0]?.city.region ? `${returnStops[0].city.region}, ` : ""}
                        {returnStops[0]?.city.country}
                      </p>
                    </div>
                    {returnStops[0]?.city.description && (
                      <p className="mt-3 text-xs text-gray-300 leading-relaxed">
                        {returnStops[0].city.description}
                      </p>
                    )}
                  </article>

                  {/* Point 2: Return Destination (Home City) */}
                  <article className="rounded-2xl border border-emerald-500/30 bg-slate-900/60 p-5 shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full border border-emerald-500/40 bg-emerald-950/60 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
                        To: Return Arrival (Home City (Departure))
                      </span>
                      <span className="text-xs font-bold text-gray-400">Fixed Point 2</span>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-xl font-bold text-white">{returnStops[1]?.city.name}</h4>
                      <p className="text-xs text-gray-400">
                        {returnStops[1]?.city.region ? `${returnStops[1].city.region}, ` : ""}
                        {returnStops[1]?.city.country}
                      </p>
                    </div>
                    {returnStops[1]?.city.description && (
                      <p className="mt-3 text-xs text-gray-300 leading-relaxed">
                        {returnStops[1].city.description}
                      </p>
                    )}
                  </article>
                </div>
              </div>
            </div>
          ) : stops.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {stops.map((stop, idx) => {
                const isOrigin = idx === 0;
                const isDest = idx === stops.length - 1 && stops.length > 1;
                const badgeColor = isOrigin
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : isDest
                  ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                  : "bg-sky-500/20 text-sky-400 border-sky-500/30";
                const roleText = isOrigin
                  ? "Home City (Departure)"
                  : isDest
                  ? "Final Destination"
                  : `Intermediate Stop #${idx}`;

                return (
                  <article
                    key={stop.id || `stop-${idx}`}
                    className="group relative overflow-hidden rounded-3xl border border-white/15 bg-slate-950/70 p-5 shadow-xl backdrop-blur-xl transition hover:border-sky-500/40"
                  >
                    {/* Header with badge */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider ${badgeColor}`}
                      >
                        {roleText}
                      </span>
                      <span className="text-xs font-bold text-gray-400">
                        {isOrigin ? "Departure" : `Destination ${idx} of ${Math.max(1, stops.length - 1)}`}
                      </span>
                    </div>

                    {/* City Info */}
                    <div className="mt-4">
                      <h3 className="text-lg font-bold text-white group-hover:text-sky-400 transition">
                        {stop.city.name}
                      </h3>
                      <p className="text-xs text-gray-400">
                        {stop.city.region
                          ? `${stop.city.region}, ${stop.city.country}`
                          : stop.city.country}
                      </p>
                    </div>

                    {/* Coordinates & Dates */}
                    <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-gray-400">
                      {stop.city.latitude && stop.city.longitude ? (
                        <span className="rounded-xl bg-white/5 px-2.5 py-1">
                          📍 {Number(stop.city.latitude).toFixed(2)}°, {Number(stop.city.longitude).toFixed(2)}°
                        </span>
                      ) : null}
                      <span className="rounded-xl bg-white/5 px-2.5 py-1">
                        🗓️ {stop.start_date} → {stop.end_date}
                      </span>
                    </div>

                    {/* Description */}
                    {stop.city.description && (
                      <p className="mt-3 text-xs text-gray-300 line-clamp-2">
                        {stop.city.description}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
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
          )}
        </div>
      </main>
    </div>
  );
}
