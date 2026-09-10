import type { TripListItem } from "@/api/types";
import { fakeTrips } from "@/data/fakeTrips";

// Local demo store used while USE_FAKE_DATA is on, so trips created on the
// Create Trip screen show up in My Trips. Swap for the API when the backend
// is ready — the shape matches GET /trips exactly.
const KEY = "globetrotter.trips";

function isBrowser() {
  return typeof window !== "undefined";
}

export function loadTrips(): TripListItem[] {
  if (!isBrowser()) return fakeTrips;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return fakeTrips;
    return JSON.parse(raw) as TripListItem[];
  } catch {
    return fakeTrips;
  }
}

export function saveTrips(trips: TripListItem[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(KEY, JSON.stringify(trips));
}

export function addTrip(trip: Omit<TripListItem, "id">): TripListItem {
  const trips = loadTrips();
  const created: TripListItem = {
    ...trip,
    id: trips.reduce((max, t) => Math.max(max, t.id), 0) + 1,
  };
  saveTrips([created, ...trips]);
  return created;
}

export function tripDays(trip: TripListItem) {
  const start = new Date(`${trip.start_date}T00:00:00`).getTime();
  const end = new Date(`${trip.end_date}T00:00:00`).getTime();
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

const ACTIVE_TRIP_KEY = "globetrotter.activeTripId";

export function getActiveTripId(): number | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(ACTIVE_TRIP_KEY);
  return raw ? Number(raw) : null;
}

export function setActiveTripId(id: number) {
  if (!isBrowser()) return;
  window.localStorage.setItem(ACTIVE_TRIP_KEY, String(id));
}

