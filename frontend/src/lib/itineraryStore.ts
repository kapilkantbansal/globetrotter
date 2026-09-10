import type { City, TripListItem } from "@/api/types";
import { fakeActivities } from "@/data/fakeActivities";
import { loadTrips, saveTrips } from "@/lib/tripStore";

// Local demo store for itinerary stops while USE_FAKE_DATA is on.
// Shape mirrors the API `Stop` contract so swapping in the backend is trivial.

export interface StoredStop {
  id: string;
  city: City;
  start_date: string;
  end_date: string;
  activity_ids: number[];
}

const KEY = "globetrotter.itineraries";

type Store = Record<string, StoredStop[]>;

function isBrowser() {
  return typeof window !== "undefined";
}

function readStore(): Store {
  if (!isBrowser()) return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Store;
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  if (!isBrowser()) return;
  window.localStorage.setItem(KEY, JSON.stringify(store));
}

export function loadStops(tripId: number): StoredStop[] {
  return readStore()[String(tripId)] ?? [];
}

export function saveStops(tripId: number, stops: StoredStop[]) {
  const store = readStore();
  store[String(tripId)] = stops;
  writeStore(store);

  // keep stop_count on the trip list in sync (excluding the first home departure city)
  const trips = loadTrips().map((t: TripListItem) =>
    t.id === tripId ? { ...t, stop_count: Math.max(0, stops.length - 1) } : t,
  );
  saveTrips(trips);
}

export function newStopId() {
  return `stop_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function activityById(id: number) {
  return fakeActivities.find((a) => a.id === id);
}

export function stopCost(stop: StoredStop) {
  return stop.activity_ids.reduce((sum, id) => sum + (activityById(id)?.cost ?? 0), 0);
}

export function stopNights(stop: StoredStop) {
  const start = new Date(`${stop.start_date}T00:00:00`).getTime();
  const end = new Date(`${stop.end_date}T00:00:00`).getTime();
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

/** Estimated stay + transport per stop, used for the budget breakdown. */
export const STAY_PER_NIGHT = 3200;
export const TRANSPORT_PER_STOP = 4500;
export const MEALS_PER_DAY = 1200;

export function tripBudget(stops: StoredStop[]) {
  const activities = stops.reduce((s, st) => s + stopCost(st), 0);
  const days = stops.reduce((s, st) => s + stopNights(st), 0);
  const stay = days * STAY_PER_NIGHT;
  const transport = stops.length * TRANSPORT_PER_STOP;
  const meals = days * MEALS_PER_DAY;
  const total = activities + stay + transport + meals;
  return {
    activities,
    stay,
    transport,
    meals,
    total,
    days,
    avgPerDay: days ? Math.round(total / days) : 0,
  };
}

export function eachDate(start: string, end: string): string[] {
  const out: string[] = [];
  const cur = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  while (cur <= last) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function formatDay(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function inr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export type TransportMode = "flight" | "drive" | "train" | "bus";

export interface ReturnJourneyConfig {
  enabled: boolean;
  transportMode: TransportMode;
  travelHours: number;
}

const RETURN_JOURNEY_KEY = "globetrotter.return_journeys";

export function loadReturnJourney(tripId: number): ReturnJourneyConfig {
  if (!isBrowser()) return { enabled: false, transportMode: "flight", travelHours: 2 };
  try {
    const raw = window.localStorage.getItem(RETURN_JOURNEY_KEY);
    if (!raw) return { enabled: false, transportMode: "flight", travelHours: 2 };
    const data = JSON.parse(raw) as Record<string, ReturnJourneyConfig>;
    const cfg = data[String(tripId)];
    if (cfg) {
      return {
        enabled: Boolean(cfg.enabled),
        transportMode: cfg.transportMode || "flight",
        travelHours:
          typeof cfg.travelHours === "number" && !isNaN(cfg.travelHours)
            ? cfg.travelHours
            : 2,
      };
    }
  } catch {
    // fallback
  }
  return { enabled: false, transportMode: "flight", travelHours: 2 };
}

export function saveReturnJourney(tripId: number, config: ReturnJourneyConfig) {
  if (!isBrowser()) return;
  try {
    const raw = window.localStorage.getItem(RETURN_JOURNEY_KEY);
    const data = raw ? (JSON.parse(raw) as Record<string, ReturnJourneyConfig>) : {};
    data[String(tripId)] = config;
    window.localStorage.setItem(RETURN_JOURNEY_KEY, JSON.stringify(data));
    window.dispatchEvent(
      new CustomEvent("globetrotter:return-journey-updated", {
        detail: { tripId, config },
      })
    );
  } catch {
    // ignore
  }
}
