import { useEffect, useMemo, useState, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarDays,
  Clock,
  LayoutList,
  MapPin,
  Wallet,
  Globe2,
  Navigation,
  ArrowRight,
  PlaneTakeoff,
  RotateCcw,
  Sparkles,
  Printer,
  Plus,
  Trash2,
  Compass,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Share2,
  Building2,
  Car,
  Train,
  Plane,
  Luggage,
  X,
  PlusCircle,
  Eye,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { TripPicker } from "@/components/TripPicker";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { getMyTrips } from "@/api/tripsApi";
import { searchCities } from "@/api/citiesApi";
import { searchActivities } from "@/api/activitiesApi";
import { getStops } from "@/api/stopsApi";
import { fakeActivities } from "@/data/fakeActivities";
import { USE_FAKE_DATA } from "@/config";
import {
  loadTrips,
  getActiveTripId,
  setActiveTripId,
} from "@/lib/tripStore";
import {
  loadStops,
  saveStops,
  loadReturnJourney,
  saveReturnJourney,
  type StoredStop,
  type ReturnJourneyConfig,
  type TransportMode,
  eachDate,
  formatDay,
  inr,
} from "@/lib/itineraryStore";
import {
  getCityFallbackImage,
  getCitiesDistanceKm,
} from "@/lib/cityImageHelper";
import type { TripListItem, City, Activity } from "@/api/types";

export const Route = createFileRoute("/itinerary")({
  head: () => ({
    meta: [
      { title: "Trip Itinerary & Daily Plan — GlobeTrotter" },
      {
        name: "description",
        content:
          "Detailed day-by-day travel schedule, inter-city transit distances, activity planning, and budget breakdown connected directly with 3D Globe route maps.",
      },
      { property: "og:title", content: "Trip Itinerary & Daily Plan — GlobeTrotter" },
      {
        property: "og:description",
        content:
          "Explore your chronological day-by-day travel itinerary with transit times, distances, and activity schedules.",
      },
    ],
  }),
  component: ItineraryPage,
});

type View = "timeline" | "route" | "calendar";

function formatFullDate(iso: string) {
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function toDate(iso: string) {
  return new Date(`${iso}T00:00:00`);
}

function ItineraryPage() {
  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [tripId, setTripId] = useState<number | null>(null);
  const [stops, setStops] = useState<StoredStop[]>([]);
  const [returnJourney, setReturnJourney] = useState<ReturnJourneyConfig>({
    enabled: false,
    transportMode: "flight",
    travelHours: 2,
  });
  const [activityCache, setActivityCache] = useState<Record<number, Activity>>({});
  const [view, setView] = useState<View>("timeline");
  const [loading, setLoading] = useState(false);
  const [activityModalStopId, setActivityModalStopId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Populate activity cache with fake activities immediately
  useEffect(() => {
    const initialMap: Record<number, Activity> = {};
    fakeActivities.forEach((a) => {
      initialMap[a.id] = a;
    });
    setActivityCache(initialMap);

    // Fetch dynamic activities if available
    if (!USE_FAKE_DATA) {
      searchActivities({})
        .then((res) => {
          setActivityCache((prev) => {
            const next = { ...prev };
            res.data.forEach((a) => (next[a.id] = a));
            return next;
          });
        })
        .catch(() => {
          // fallback to fake activities
        });
    }
  }, []);

  // Fetch trips from database or local store
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

  // Load stops and return journey whenever tripId changes
  const reloadTripData = useCallback((id: number) => {
    setActiveTripId(id);
    const local = loadStops(id);
    const rj = loadReturnJourney(id);
    setReturnJourney(rj);

    if (local.length > 0) {
      setStops(local);
    } else {
      // If local store is empty, attempt API fallback
      getStops(id)
        .then(async (res) => {
          if (res.data && res.data.length > 0) {
            const citiesRes = await searchCities("");
            const cityMap = new Map(citiesRes.data.map((c) => [c.id, c]));
            const loadedStops: StoredStop[] = res.data.map((s) => ({
              id: String(s.id),
              city: cityMap.get(s.city_id) ?? {
                id: s.city_id,
                name: "Destination",
                country: "",
                cost_index: 0,
                popularity: 0,
              },
              start_date: s.start_date,
              end_date: s.end_date,
              activity_ids: s.activity_ids ?? [],
            }));
            setStops(loadedStops);
            saveStops(id, loadedStops);
          } else {
            setStops([]);
          }
        })
        .catch(() => {
          setStops([]);
        });
    }
  }, []);

  useEffect(() => {
    if (tripId == null) {
      setStops([]);
      setReturnJourney({ enabled: false, transportMode: "flight", travelHours: 2 });
      return;
    }
    reloadTripData(tripId);
  }, [tripId, reloadTripData]);

  // Synchronize across browser tabs/pages on route updates
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (
        tripId != null &&
        (e.key === "globetrotter.itineraries" || e.key === "globetrotter.return_journeys")
      ) {
        reloadTripData(tripId);
      }
    }
    function handleReturnUpdated(e: any) {
      if (tripId != null && e.detail?.tripId === tripId) {
        reloadTripData(tripId);
      }
    }
    function handleStopsUpdated(e: any) {
      if (tripId != null && e.detail?.tripId === tripId) {
        reloadTripData(tripId);
      }
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener("globetrotter:return-journey-updated", handleReturnUpdated);
    window.addEventListener("globetrotter:stops-updated", handleStopsUpdated);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("globetrotter:return-journey-updated", handleReturnUpdated);
      window.removeEventListener("globetrotter:stops-updated", handleStopsUpdated);
    };
  }, [tripId, reloadTripData]);

  const activeTrip = trips.find((t) => t.id === tripId) ?? null;

  // Compute Synthetic Single Direct Return Leg
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

  // Distance calculations
  const totalGoingDistanceKm = useMemo(() => {
    if (stops.length < 2) return 0;
    let sum = 0;
    for (let i = 0; i < stops.length - 1; i++) {
      sum += getCitiesDistanceKm(stops[i]!.city, stops[i + 1]!.city);
    }
    return sum;
  }, [stops]);

  const returnDirectDistKm = useMemo(() => {
    if (returnStops.length < 2) return 0;
    return getCitiesDistanceKm(returnStops[0]!.city, returnStops[1]!.city);
  }, [returnStops]);

  const totalOverallDistanceKm =
    totalGoingDistanceKm + (returnJourney.enabled ? returnDirectDistKm : 0);

  // Destinations count (stops + final destination, excluding origin city per user rule)
  const destinationCount = Math.max(0, stops.length - 1);

  // Day-by-day mapping
  const tripDays = useMemo(() => {
    if (stops.length === 0) return [];
    // Collect all unique dates in chronological order
    const dateMap = new Map<
      string,
      {
        date: string;
        stops: StoredStop[];
        transitLeg?: {
          fromCity: City;
          toCity: City;
          distanceKm: number;
          mode: TransportMode;
          hours: number;
        };
        isReturnLeg?: boolean;
      }
    >();

    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i]!;
      const dates = eachDate(stop.start_date, stop.end_date);

      dates.forEach((d, dIdx) => {
        if (!dateMap.has(d)) {
          dateMap.set(d, { date: d, stops: [] });
        }
        const entry = dateMap.get(d)!;
        if (!entry.stops.some((s) => s.id === stop.id)) {
          entry.stops.push(stop);
        }

        // Check if there is an inter-city transfer on this day (e.g. at the boundary between stops)
        if (dIdx === dates.length - 1 && i < stops.length - 1) {
          const nextStop = stops[i + 1]!;
          entry.transitLeg = {
            fromCity: stop.city,
            toCity: nextStop.city,
            distanceKm: getCitiesDistanceKm(stop.city, nextStop.city),
            mode: "flight",
            hours: Math.max(1, Math.round(getCitiesDistanceKm(stop.city, nextStop.city) / 450)),
          };
        }
      });
    }

    const sorted = [...dateMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([_, val]) => val);

    // If return journey is enabled, append or annotate return transit leg on the last day
    if (returnJourney.enabled && returnStops.length >= 2 && sorted.length > 0) {
      const lastDay = sorted[sorted.length - 1]!;
      lastDay.transitLeg = {
        fromCity: returnStops[0]!.city,
        toCity: returnStops[1]!.city,
        distanceKm: returnDirectDistKm,
        mode: returnJourney.transportMode || "flight",
        hours: returnJourney.travelHours || 2,
      };
      lastDay.isReturnLeg = true;
    }

    return sorted;
  }, [stops, returnJourney, returnStops, returnDirectDistKm]);

  // Budget calculations
  const budget = useMemo(() => {
    let activitiesTotal = 0;
    stops.forEach((s) =>
      s.activity_ids.forEach((id) => {
        const a = activityCache[id];
        if (a) activitiesTotal += a.cost;
      }),
    );

    const plannedDaysCount = Math.max(1, tripDays.length || 1);
    const stay = plannedDaysCount * 3200;
    const transport = Math.max(2500, Math.round(totalOverallDistanceKm * 4.2));
    const meals = plannedDaysCount * 1200;
    const total = activitiesTotal + stay + transport + meals;

    return {
      total,
      days: plannedDaysCount,
      avgPerDay: Math.round(total / plannedDaysCount),
      activities: activitiesTotal,
      stay,
      transport,
      meals,
    };
  }, [stops, activityCache, tripDays, totalOverallDistanceKm]);

  // Activity management handlers
  function handleAddActivity(stopId: string, activityId: number) {
    if (tripId == null) return;
    const updated = stops.map((s) => {
      if (s.id === stopId) {
        if (s.activity_ids.includes(activityId)) return s;
        return { ...s, activity_ids: [...s.activity_ids, activityId] };
      }
      return s;
    });
    setStops(updated);
    saveStops(tripId, updated);
    toast.success("Activity added to your itinerary schedule!");
    setActivityModalStopId(null);
  }

  function handleRemoveActivity(stopId: string, activityId: number) {
    if (tripId == null) return;
    const updated = stops.map((s) => {
      if (s.id === stopId) {
        return { ...s, activity_ids: s.activity_ids.filter((id) => id !== activityId) };
      }
      return s;
    });
    setStops(updated);
    saveStops(tripId, updated);
    toast.info("Activity removed from day plan.");
  }

  const stopDates = useMemo(() => tripDays.map((d) => toDate(d.date)), [tripDays]);
  const tripRange = activeTrip
    ? { from: toDate(activeTrip.start_date), to: toDate(activeTrip.end_date) }
    : undefined;

  // Selected stop for activity modal
  const targetStopForModal = stops.find((s) => s.id === activityModalStopId) ?? null;

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-24">
        {/* TOP HERO HEADER & CROSS-PAGE CONNECTION BAR */}
        <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-wrap items-start justify-between gap-6 border-b border-white/10 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-sky-400">
                  <CalendarDays className="size-3.5" />
                  Trip Master Schedule
                </span>
                {activeTrip && (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-gray-300">
                    {activeTrip.start_date} → {activeTrip.end_date}
                  </span>
                )}
              </div>
              <h1 className="mt-2.5 text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                {activeTrip ? activeTrip.name : "Select an Itinerary"}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-400 max-w-2xl">
                Seamlessly synchronized with your route builder and cities. Manage daily transit legs, scheduled activities, and travel budgets.
              </p>
            </div>

            {/* Cross-Page Action Hub: Connecting Itinerary <-> Map (Builder) <-> Cities <-> Activities */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                to="/itinerary-builder"
                className="gradient-sunset inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lift transition hover:opacity-95"
                title="View interactive 3D Globe and 2D high-detail map"
              >
                <Globe2 className="size-4" />
                <span>View on Map →</span>
              </Link>
              <Link
                to="/cities"
                className="inline-flex items-center gap-2 rounded-2xl border border-sky-500/30 bg-sky-500/15 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-sky-400 transition hover:bg-sky-500/25 shadow-md"
                title="Manage departure city, intermediate stops, and final destinations"
              >
                <MapPin className="size-4" />
                <span>Edit Cities & Stops</span>
              </Link>
              <Link
                to="/activities"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-slate-900/90 px-3.5 py-2.5 text-xs font-bold text-gray-300 transition hover:border-white/30 hover:text-white shadow-md"
                title="Browse sightseeing and adventure experiences"
              >
                <Sparkles className="size-4 text-amber-400" />
                <span>Activities</span>
              </Link>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-slate-900/90 px-3.5 py-2.5 text-xs font-bold text-gray-300 transition hover:border-white/30 hover:text-white shadow-md"
                title="Print or export travel itinerary"
              >
                <Printer className="size-4" />
                <span className="hidden sm:inline">Print Plan</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Duration</p>
              <p className="mt-1 text-xl sm:text-2xl font-extrabold text-white">
                {budget.days} <span className="text-xs font-medium text-gray-400">Days</span>
              </p>
              <p className="text-[11px] text-gray-400">{stops.length} city stops planned</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Destinations</p>
              <p className="mt-1 text-xl sm:text-2xl font-extrabold text-sky-400">
                {destinationCount} <span className="text-xs font-medium text-gray-400">Places</span>
              </p>
              <p className="text-[11px] text-gray-400">Excludes home departure city</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Distance</p>
              <p className="mt-1 text-xl sm:text-2xl font-extrabold text-emerald-400">
                ~{totalOverallDistanceKm.toLocaleString()} <span className="text-xs font-medium text-gray-400">km</span>
              </p>
              <p className="text-[11px] text-gray-400">
                {returnJourney.enabled ? "Includes direct return" : "One-way going transit"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Estimated Budget</p>
              <p className="mt-1 text-xl sm:text-2xl font-extrabold text-amber-400">
                {inr(budget.total)}
              </p>
              <p className="text-[11px] text-gray-400">~{inr(budget.avgPerDay)} / day average</p>
            </div>
          </div>

          {/* Journey Route Visual Summary Banner */}
          {stops.length > 0 && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900/90 via-slate-950 to-slate-900/90 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
                  <Navigation className="size-4 text-sky-400" />
                  <span>Route Sequence Overview</span>
                </div>
                <Link
                  to="/itinerary-builder"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 transition"
                >
                  <span>Open in 3D / 2D Explorer</span>
                  <ExternalLink className="size-3.5" />
                </Link>
              </div>

              {/* Waypoints Sequence with Green/Red indicators and distance pills */}
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                {stops.map((stop, idx) => {
                  const isOrigin = idx === 0;
                  const isDest = idx === stops.length - 1 && stops.length > 1;
                  const symbol = isOrigin ? "🟢" : isDest ? "🔴" : "📍";
                  const nextStop = stops[idx + 1];
                  const legDist = nextStop ? getCitiesDistanceKm(stop.city, nextStop.city) : 0;

                  return (
                    <div key={stop.id} className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 font-bold ${
                          isOrigin
                            ? "border-emerald-500/40 bg-emerald-950/80 text-emerald-300"
                            : isDest
                            ? "border-rose-500/40 bg-rose-950/80 text-rose-300"
                            : "border-sky-500/40 bg-sky-950/80 text-sky-300"
                        }`}
                      >
                        <span>{symbol}</span>
                        <span>{stop.city.name}</span>
                      </span>

                      {nextStop && (
                        <div className="flex items-center gap-1 text-gray-400">
                          <span className="rounded-full border border-sky-500/30 bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-sky-300">
                            ~{legDist.toLocaleString()} km
                          </span>
                          <ArrowRight className="size-3.5 text-sky-400" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Return leg if active */}
                {returnJourney.enabled && returnStops.length >= 2 && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-indigo-400">
                      <span className="rounded-full border border-indigo-500/40 bg-indigo-950 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                        ~{returnDirectDistKm.toLocaleString()} km (Direct Return)
                      </span>
                      <ArrowRight className="size-3.5 text-indigo-400" />
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/80 px-3 py-1 font-bold text-emerald-300">
                      <span>🟢</span>
                      <span>{stops[0]!.city.name}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* MAIN BODY: SIDEBAR + CONTENT TABS */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[320px_1fr]">
          {/* SIDEBAR */}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            {/* Active Trip Picker */}
            <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-5 shadow-xl backdrop-blur-xl">
              <label
                htmlFor="trip-select-itinerary"
                className="block text-xs font-bold uppercase tracking-wider text-sky-400 mb-2"
              >
                Active Trip Selector
              </label>
              <select
                id="trip-select-itinerary"
                value={tripId ?? ""}
                onChange={(e) => {
                  const newId = Number(e.target.value);
                  setTripId(newId);
                  setActiveTripId(newId);
                }}
                className="w-full rounded-2xl border border-white/15 bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-white outline-none focus:border-sky-400 transition"
              >
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Budget & Expense Breakdown */}
            <section className="rounded-3xl border border-white/10 bg-slate-950/80 p-5 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                  <Wallet className="size-4 text-amber-400" />
                  <span>Estimated Budget</span>
                </h3>
                <span className="text-xs font-bold text-amber-400">{inr(budget.total)}</span>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Calculated for {budget.days} days across {stops.length} cities:
              </p>

              <div className="mt-4 space-y-3">
                {[
                  { label: "Accommodations & Stays", val: budget.stay, color: "from-sky-500 to-sky-400" },
                  { label: "Inter-City Transit & Travel", val: budget.transport, color: "from-indigo-500 to-indigo-400" },
                  { label: "Meals & Daily Dining", val: budget.meals, color: "from-emerald-500 to-emerald-400" },
                  { label: "Sightseeing & Activities", val: budget.activities, color: "from-amber-500 to-amber-400" },
                ].map((item) => {
                  const pct = budget.total ? Math.round((item.val / budget.total) * 100) : 0;
                  return (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">{item.label}</span>
                        <span className="font-semibold text-white">{inr(item.val)}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${item.color}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                <p className="text-[11px] text-gray-400">Daily Average</p>
                <p className="text-lg font-bold text-white">{inr(budget.avgPerDay)} / day</p>
              </div>
            </section>

            {/* Fast Navigation Quick Links */}
            <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-5 shadow-xl backdrop-blur-xl space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                Trip Navigation
              </p>
              <Link
                to="/itinerary-builder"
                className="flex items-center justify-between rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-xs font-bold text-sky-400 transition hover:bg-sky-500/20"
              >
                <span className="flex items-center gap-2">
                  <Globe2 className="size-4" />
                  <span>3D & 2D Map Explorer</span>
                </span>
                <ChevronRight className="size-4" />
              </Link>
              <Link
                to="/cities"
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-xs font-bold text-gray-300 transition hover:border-sky-400 hover:text-white"
              >
                <span className="flex items-center gap-2">
                  <MapPin className="size-4 text-emerald-400" />
                  <span>Manage Cities & Route</span>
                </span>
                <ChevronRight className="size-4" />
              </Link>
              <Link
                to="/activities"
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-xs font-bold text-gray-300 transition hover:border-amber-400 hover:text-white"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="size-4 text-amber-400" />
                  <span>Explore Activities</span>
                </span>
                <ChevronRight className="size-4" />
              </Link>
            </div>
          </aside>

          {/* MAIN ITINERARY SCHEDULE VIEWS */}
          <section className="space-y-6">
            {/* View Mode Switcher Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-slate-950/80 p-4 shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">View Mode:</span>
              </div>

              <div
                role="tablist"
                aria-label="Itinerary view"
                className="flex items-center gap-1.5 rounded-2xl border border-white/15 bg-slate-900/90 p-1 shadow-md"
              >
                {(
                  [
                    ["timeline", "Day-by-Day Timeline", LayoutList],
                    ["route", "Route & Stops", Navigation],
                    ["calendar", "Trip Calendar", CalendarDays],
                  ] as const
                ).map(([key, label, Icon]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={view === key}
                    onClick={() => setView(key)}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                      view === key
                        ? "bg-sky-500 text-slate-950 shadow-md"
                        : "text-gray-300 hover:text-white"
                    }`}
                  >
                    <Icon className="size-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* CONTENT BY VIEW */}
            {stops.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/20 bg-slate-950/40 p-16 text-center shadow-xl">
                <Compass className="mx-auto size-14 text-sky-400/60" />
                <h3 className="mt-4 text-lg font-bold text-white">
                  No cities or stops configured yet for {activeTrip?.name || "this trip"}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-gray-400 max-w-md mx-auto">
                  Start by searching your departure city and final destinations in the Cities section.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    to="/cities"
                    className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-950 shadow-lg transition hover:bg-sky-400"
                  >
                    <PlusCircle className="size-4" />
                    Configure Cities Now
                  </Link>
                  <Link
                    to="/itinerary-builder"
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white/20"
                  >
                    <Globe2 className="size-4" />
                    View Map Explorer
                  </Link>
                </div>
              </div>
            ) : view === "calendar" ? (
              <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-2xl backdrop-blur-xl space-y-6">
                <div className="border-b border-white/10 pb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <CalendarDays className="size-5 text-sky-400" />
                    <span>Interactive Trip Calendar</span>
                  </h3>
                  <p className="mt-1 text-xs text-gray-400">
                    Visual calendar showing scheduled stay intervals and travel transit dates.
                  </p>
                </div>

                <div className="flex justify-center p-2">
                  <Calendar
                    mode="single"
                    numberOfMonths={2}
                    {...(tripRange ? { defaultMonth: tripRange.from, startMonth: tripRange.from } : {})}
                    modifiers={{ ...(tripRange ? { trip: tripRange } : {}), planned: stopDates }}
                    modifiersClassNames={{
                      trip: "bg-sky-500/20 text-white rounded-none",
                      planned: "bg-sky-500 text-slate-950 font-bold rounded-lg shadow-md",
                    }}
                    className="rounded-3xl border border-white/15 bg-slate-900/90 p-5 text-white"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-4 border-t border-white/10">
                  {stops.map((stop, i) => {
                    const isOrigin = i === 0;
                    const isDest = i === stops.length - 1 && stops.length > 1;
                    return (
                      <div
                        key={stop.id}
                        className={`rounded-2xl border p-4 ${
                          isOrigin
                            ? "border-emerald-500/40 bg-emerald-950/40"
                            : isDest
                            ? "border-rose-500/40 bg-rose-950/40"
                            : "border-sky-500/30 bg-slate-900/60"
                        }`}
                      >
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-sky-400">
                          {isOrigin ? "🟢 Home City" : isDest ? "🔴 Final Destination" : `Stop #${i}`}
                        </p>
                        <h4 className="mt-1 text-base font-bold text-white">{stop.city.name}</h4>
                        <p className="text-xs text-gray-400">
                          {formatDay(stop.start_date)} → {formatDay(stop.end_date)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : view === "route" ? (
              <div className="space-y-6">
                {stops.map((stop, idx) => {
                  const isOrigin = idx === 0;
                  const isDest = idx === stops.length - 1 && stops.length > 1;
                  const nextStop = stops[idx + 1];
                  const legDist = nextStop ? getCitiesDistanceKm(stop.city, nextStop.city) : 0;
                  const fallbackImg = getCityFallbackImage(stop.city.name, stop.city.country);

                  return (
                    <div key={stop.id} className="space-y-4">
                      <article className="overflow-hidden rounded-3xl border border-white/15 bg-slate-950/80 shadow-2xl backdrop-blur-xl transition hover:border-sky-500/40">
                        <div className="grid sm:grid-cols-[220px_1fr]">
                          {/* City Image */}
                          <div className="relative h-48 sm:h-full w-full overflow-hidden bg-slate-900">
                            <img
                              src={stop.city.image_url || fallbackImg}
                              alt={stop.city.name}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = fallbackImg;
                              }}
                              className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                            />
                            <div className="absolute top-3 left-3">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-extrabold shadow-md backdrop-blur-md ${
                                  isOrigin
                                    ? "border-emerald-500/40 bg-emerald-950/80 text-emerald-300"
                                    : isDest
                                    ? "border-rose-500/40 bg-rose-950/80 text-rose-300"
                                    : "border-sky-500/40 bg-sky-950/80 text-sky-300"
                                }`}
                              >
                                <span>{isOrigin ? "🟢" : isDest ? "🔴" : "📍"}</span>
                                <span>
                                  {isOrigin
                                    ? "Home City (Departure)"
                                    : isDest
                                    ? "Final Destination"
                                    : `Waypoint #${idx}`}
                                </span>
                              </span>
                            </div>
                          </div>

                          {/* Stop Details */}
                          <div className="p-6 flex flex-col justify-between space-y-4">
                            <div>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <h3 className="text-xl font-extrabold text-white tracking-tight">
                                  {stop.city.name}
                                </h3>
                                <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-gray-300">
                                  🗓️ {formatDay(stop.start_date)} → {formatDay(stop.end_date)}
                                </span>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">
                                {stop.city.region ? `${stop.city.region}, ` : ""}
                                {stop.city.country}
                              </p>

                              {stop.city.description && (
                                <p className="mt-3 text-xs text-gray-300 leading-relaxed line-clamp-2">
                                  {stop.city.description}
                                </p>
                              )}
                            </div>

                            {/* Scheduled Activities for Stop */}
                            <div>
                              <div className="flex items-center justify-between border-t border-white/10 pt-3">
                                <span className="text-xs font-bold text-gray-400">
                                  {stop.activity_ids.length}{" "}
                                  {stop.activity_ids.length === 1 ? "Activity" : "Activities"} Scheduled
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setActivityModalStopId(stop.id)}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-bold text-sky-400 hover:bg-sky-500/20 transition"
                                >
                                  <Plus className="size-3.5" />
                                  <span>Add Activity</span>
                                </button>
                              </div>

                              {stop.activity_ids.length > 0 && (
                                <div className="mt-2.5 flex flex-wrap gap-2">
                                  {stop.activity_ids.map((actId) => {
                                    const act = activityCache[actId];
                                    if (!act) return null;
                                    return (
                                      <span
                                        key={actId}
                                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/80 px-2.5 py-1 text-xs text-gray-200"
                                      >
                                        <span>{act.name}</span>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveActivity(stop.id, actId)}
                                          className="text-gray-400 hover:text-rose-400 transition"
                                          title="Remove activity"
                                        >
                                          <X className="size-3" />
                                        </button>
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>

                      {/* Transit Arrow to Next City */}
                      {nextStop && (
                        <div className="flex flex-col items-center justify-center py-2">
                          <div className="flex items-center gap-2 rounded-full border border-sky-500/40 bg-slate-900/95 px-4 py-1.5 shadow-lg text-sky-300 text-xs font-bold tracking-wide backdrop-blur-md">
                            <PlaneTakeoff className="size-3.5 text-sky-400" />
                            <span>Transit to {nextStop.city.name}:</span>
                            <span className="text-white font-extrabold">~{legDist.toLocaleString()} km</span>
                          </div>
                          <div className="h-4 w-0.5 bg-gradient-to-b from-sky-500/50 to-sky-400 my-1" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Return Journey Card if enabled */}
                {returnJourney.enabled && returnStops.length >= 2 && (
                  <div className="space-y-4 pt-2">
                    <div className="flex flex-col items-center justify-center py-2">
                      <div className="flex items-center gap-2 rounded-full border border-indigo-500/40 bg-indigo-950/90 px-4 py-1.5 shadow-lg text-indigo-300 text-xs font-bold tracking-wide backdrop-blur-md">
                        <RotateCcw className="size-3.5 text-indigo-400" />
                        <span>Direct Return Transit Leg:</span>
                        <span className="text-white font-extrabold">~{returnDirectDistKm.toLocaleString()} km</span>
                      </div>
                      <div className="h-4 w-0.5 bg-gradient-to-b from-indigo-500/50 to-indigo-400 my-1" />
                    </div>

                    <article className="overflow-hidden rounded-3xl border border-indigo-500/40 bg-gradient-to-r from-indigo-950/30 via-slate-950/80 to-indigo-950/30 p-6 shadow-2xl backdrop-blur-xl">
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-indigo-500/20 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                            <RotateCcw className="size-5" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-white">Direct Non-Stop Return Journey</h3>
                            <p className="text-xs text-indigo-300">
                              {returnStops[0]!.city.name} (🔴) → {returnStops[1]!.city.name} (🟢)
                            </p>
                          </div>
                        </div>
                        <span className="rounded-full border border-indigo-500/40 bg-indigo-950 px-3.5 py-1 text-xs font-bold text-indigo-300">
                          {returnJourney.travelHours} Hours ({returnJourney.transportMode.toUpperCase()})
                        </span>
                      </div>
                      <p className="mt-3 text-xs text-gray-300 leading-relaxed">
                        Single direct segment back to your origin city. Intermediate stops are strictly excluded from destination counts.
                      </p>
                    </article>
                  </div>
                )}
              </div>
            ) : (
              /* TIMELINE VIEW (DAY-BY-DAY SCHEDULE) */
              <div className="space-y-6">
                {tripDays.map((dayItem, dayIdx) => {
                  const dayNumber = dayIdx + 1;
                  const currentStop = dayItem.stops[0];
                  const fallbackImg = currentStop
                    ? getCityFallbackImage(currentStop.city.name, currentStop.city.country)
                    : "";

                  return (
                    <article
                      key={dayItem.date}
                      className="overflow-hidden rounded-3xl border border-white/15 bg-slate-950/80 shadow-2xl backdrop-blur-xl"
                    >
                      {/* Day Header Banner */}
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-slate-900/80 px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400 font-extrabold text-sm">
                            D{dayNumber}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-extrabold uppercase tracking-wider text-sky-400">
                                Day {dayNumber}
                              </span>
                              <span className="text-gray-400">·</span>
                              <span className="text-xs font-bold text-white">
                                {formatFullDate(dayItem.date)}
                              </span>
                            </div>
                            <h3 className="text-base font-bold text-white">
                              {dayItem.stops.map((s) => s.city.name).join(" & ")}
                            </h3>
                          </div>
                        </div>

                        {/* Location / Action Pill */}
                        <div className="flex items-center gap-2">
                          <Link
                            to="/itinerary-builder"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-300 hover:text-white transition"
                          >
                            <Globe2 className="size-3.5 text-sky-400" />
                            <span>View on Map</span>
                          </Link>
                          {currentStop && (
                            <button
                              type="button"
                              onClick={() => setActivityModalStopId(currentStop.id)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 py-1.5 text-xs font-bold text-sky-300 hover:bg-sky-500/25 transition"
                            >
                              <Plus className="size-3.5" />
                              <span>Add Activity</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Day Details */}
                      <div className="p-6 space-y-5">
                        {/* Transit leg between cities if applicable */}
                        {dayItem.transitLeg && (
                          <div
                            className={`rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-4 ${
                              dayItem.isReturnLeg
                                ? "border-indigo-500/40 bg-indigo-950/40"
                                : "border-sky-500/30 bg-sky-950/30"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex size-9 items-center justify-center rounded-xl bg-white/10 text-white">
                                {dayItem.isReturnLeg ? (
                                  <RotateCcw className="size-4 text-indigo-400" />
                                ) : (
                                  <Plane className="size-4 text-sky-400" />
                                )}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-white">
                                  {dayItem.isReturnLeg ? "Direct Return Transit" : "Inter-City Transfer"}:{" "}
                                  {dayItem.transitLeg.fromCity.name} ➔ {dayItem.transitLeg.toCity.name}
                                </p>
                                <p className="text-[11px] text-gray-400">
                                  ~{dayItem.transitLeg.distanceKm.toLocaleString()} km · Estimated {dayItem.transitLeg.hours}h travel
                                </p>
                              </div>
                            </div>
                            <span
                              className={`rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider ${
                                dayItem.isReturnLeg
                                  ? "border-indigo-500/40 bg-indigo-900 text-indigo-300"
                                  : "border-sky-500/40 bg-sky-900 text-sky-300"
                              }`}
                            >
                              {dayItem.isReturnLeg ? "Non-Stop Return" : "Leg Transfer"}
                            </span>
                          </div>
                        )}

                        {/* Scheduled Activities for the Stop */}
                        {dayItem.stops.map((stop) => {
                          const hasActivities = stop.activity_ids.length > 0;

                          return (
                            <div key={stop.id} className="space-y-3">
                              {!hasActivities ? (
                                <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-5 text-center">
                                  <p className="text-xs text-gray-400">
                                    Free exploration & leisure day in {stop.city.name}. No activities scheduled yet.
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => setActivityModalStopId(stop.id)}
                                    className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300 transition"
                                  >
                                    <Plus className="size-3.5" />
                                    <span>Plan an Activity for Today</span>
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-2.5">
                                  {stop.activity_ids.map((actId, actIdx) => {
                                    const act = activityCache[actId];
                                    if (!act) return null;
                                    const startHour = 9 + actIdx * 3;

                                    return (
                                      <div
                                        key={actId}
                                        className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900/80 p-4 transition hover:border-sky-500/30"
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className="flex items-center gap-1 rounded-xl bg-white/5 border border-white/10 px-2.5 py-1 text-xs font-bold text-sky-400">
                                            <Clock className="size-3.5" />
                                            <span>{String(startHour).padStart(2, "0")}:00</span>
                                          </div>
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <h4 className="text-sm font-bold text-white">{act.name}</h4>
                                              <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] uppercase font-bold text-gray-300">
                                                {act.type}
                                              </span>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                              {act.duration_hours} hrs · {act.description}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                          <span className="text-xs font-extrabold text-amber-400">
                                            {act.cost ? inr(act.cost) : "Free"}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveActivity(stop.id, actId)}
                                            className="rounded-xl border border-white/10 bg-white/5 p-1.5 text-gray-400 hover:border-rose-500/40 hover:text-rose-400 transition"
                                            title="Remove from itinerary"
                                          >
                                            <Trash2 className="size-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* MODAL: ADD ACTIVITY TO STOP */}
        {activityModalStopId && targetStopForModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-2xl rounded-3xl border border-white/20 bg-slate-950 p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="size-5 text-amber-400" />
                    <span>Add Activity to {targetStopForModal.city.name}</span>
                  </h3>
                  <p className="mt-1 text-xs text-gray-400">
                    Select an activity to schedule into your itinerary day plan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActivityModalStopId(null)}
                  className="rounded-full border border-white/15 p-2 text-gray-400 hover:text-white transition"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Category Filter */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {["all", "sightseeing", "adventure", "food", "culture"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-xl px-3 py-1 text-xs font-bold capitalize transition ${
                      selectedCategory === cat
                        ? "bg-sky-500 text-slate-950"
                        : "border border-white/10 bg-slate-900 text-gray-300 hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Activity Cards List */}
              <div className="mt-4 max-h-80 overflow-y-auto space-y-2.5 pr-1">
                {fakeActivities
                  .filter((a) => selectedCategory === "all" || a.type === selectedCategory)
                  .map((act) => {
                    const alreadyAdded = targetStopForModal.activity_ids.includes(act.id);

                    return (
                      <div
                        key={act.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/80 p-3.5 transition hover:border-sky-500/40"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">{act.name}</h4>
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase font-bold text-sky-300">
                              {act.type}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {act.duration_hours} hrs · {act.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs font-extrabold text-amber-400">
                            {act.cost ? inr(act.cost) : "Free"}
                          </span>
                          <button
                            type="button"
                            disabled={alreadyAdded}
                            onClick={() => handleAddActivity(targetStopForModal.id, act.id)}
                            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition shadow-md ${
                              alreadyAdded
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-default"
                                : "bg-sky-500 text-slate-950 hover:bg-sky-400"
                            }`}
                          >
                            {alreadyAdded ? "✓ Added" : "+ Add"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
