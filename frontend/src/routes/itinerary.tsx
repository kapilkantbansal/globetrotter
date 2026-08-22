import { useEffect, useMemo, useState, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Clock, LayoutList, MapPin, Wallet } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { TripPicker } from "@/components/TripPicker";
import { Calendar } from "@/components/ui/calendar";
import { getMyTrips } from "@/api/tripsApi";
import { searchCities } from "@/api/citiesApi";
import { searchActivities } from "@/api/activitiesApi";
import { getStops } from "@/api/stopsApi";
import type { TripListItem, City, Activity } from "@/api/types";

export const Route = createFileRoute("/itinerary")({
  head: () => ({
    meta: [{ title: "Itinerary View — GlobeTrotter" }],
  }),
  component: ItineraryPage,
});

type View = "list" | "calendar";

interface StopVM {
  id: number;
  city: City;
  start_date: string;
  end_date: string;
  activity_ids: number[];
}

const inr = (n: number) => `\u20b9${n.toLocaleString("en-IN")}`;

function toDate(iso: string) {
  return new Date(`${iso}T00:00:00`);
}

function formatDay(iso: string) {
  return toDate(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function eachDate(start: string, end: string) {
  const out: string[] = [];
  const cur = toDate(start);
  const last = toDate(end);
  while (cur <= last) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function ItineraryPage() {
  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [tripId, setTripId] = useState<number | null>(null);
  const [stops, setStops] = useState<StopVM[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [activityCache, setActivityCache] = useState<Record<number, Activity>>({});
  const [view, setView] = useState<View>("list");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const [tripsRes, citiesRes] = await Promise.all([getMyTrips(), searchCities("")]);
      setTrips(tripsRes.data);
      setCities(citiesRes.data);
      if (tripsRes.data.length) setTripId(tripsRes.data[0]!.id);
    })();
  }, []);

  const cacheActivitiesForCity = useCallback(async (cityId: number) => {
    const res = await searchActivities({ city_id: cityId });
    setActivityCache((prev) => {
      const next = { ...prev };
      res.data.forEach((a) => (next[a.id] = a));
      return next;
    });
  }, []);

  useEffect(() => {
    if (tripId == null || cities.length === 0) return;
    (async () => {
      setLoading(true);
      try {
        const res = await getStops(tripId);
        const withCity: StopVM[] = res.data.map((s) => {
          const city = cities.find((c) => c.id === s.city_id) ?? {
            id: s.city_id,
            name: "Unknown",
            country: "",
            cost_index: 0,
            popularity: 0,
          };
          return {
            id: s.id,
            city,
            start_date: s.start_date,
            end_date: s.end_date,
            activity_ids: s.activity_ids,
          };
        });
        setStops(withCity);
        const uniqueCityIds = [...new Set(withCity.map((s) => s.city.id))];
        uniqueCityIds.forEach((id) => cacheActivitiesForCity(id));
      } finally {
        setLoading(false);
      }
    })();
  }, [tripId, cities, cacheActivitiesForCity]);

  const trip = trips.find((t) => t.id === tripId) ?? null;

  const budget = useMemo(() => {
    let activitiesTotal = 0;
    stops.forEach((s) =>
      s.activity_ids.forEach((id) => {
        const a = activityCache[id];
        if (a) activitiesTotal += a.cost;
      }),
    );
    const days =
      trip && trip.start_date && trip.end_date
        ? Math.max(
            1,
            Math.round(
              (toDate(trip.end_date).getTime() - toDate(trip.start_date).getTime()) / 86400000,
            ) + 1,
          )
        : 1;
    const stay = 1500 * days;
    const transport = 500 * days;
    const meals = 600 * days;
    const total = activitiesTotal + stay + transport + meals;
    return { total, days, avgPerDay: Math.round(total / days), activities: activitiesTotal, stay, transport, meals };
  }, [stops, activityCache, trip]);

  const days = useMemo(() => {
    const map = new Map<string, StopVM[]>();
    for (const stop of stops) {
      for (const d of eachDate(stop.start_date, stop.end_date)) {
        map.set(d, [...(map.get(d) ?? []), stop]);
      }
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [stops]);

  const stopDates = useMemo(() => days.map(([d]) => toDate(d)), [days]);

  const tripRange = trip ? { from: toDate(trip.start_date), to: toDate(trip.end_date) } : undefined;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
              Step 3 of 3
            </p>
            <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">
              Your <span className="text-gradient-sunset">Itinerary</span>
            </h1>
            <p className="mt-3 max-w-xl text-muted-foreground">
              {trip
                ? `${trip.name} · ${budget.days} planned days · ${stops.length} cities`
                : "Pick a trip to see the plan."}
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Itinerary view"
            className="flex gap-1 rounded-full border border-border bg-card p-1"
          >
            {(
              [
                ["list", "List", LayoutList],
                ["calendar", "Calendar", CalendarDays],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                role="tab"
                aria-selected={view === key}
                onClick={() => setView(key)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  view === key
                    ? "gradient-sunset text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <TripPicker trips={trips} value={tripId} onChange={setTripId} />

            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                <Wallet className="size-4 text-primary" />
                Trip budget
              </h2>
              <p className="mt-2 text-3xl font-extrabold text-gradient-sunset">
                {inr(budget.total)}
              </p>
              <p className="text-xs text-muted-foreground">
                {inr(budget.avgPerDay)} average per day
              </p>
              <div className="mt-4 space-y-2">
                {(
                  [
                    ["Activities", budget.activities],
                    ["Stay", budget.stay],
                    ["Transport", budget.transport],
                    ["Meals", budget.meals],
                  ] as const
                ).map(([label, value]) => {
                  const pct = budget.total ? Math.round((value / budget.total) * 100) : 0;
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-semibold">{inr(value)}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div className="gradient-sunset h-full rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <Link
              to="/itinerary-builder"
              className="block rounded-full border border-border px-5 py-3 text-center text-sm font-semibold transition hover:bg-secondary"
            >
              Edit in builder
            </Link>
          </aside>

          <section className="space-y-5">
            {loading ? (
              <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
                <p className="text-sm text-muted-foreground">Loading itinerary…</p>
              </div>
            ) : stops.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
                <MapPin className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-3 font-display text-lg font-bold">Nothing planned yet</p>
                <Link
                  to="/itinerary-builder"
                  className="gradient-sunset mt-4 inline-flex rounded-full px-5 py-2.5 text-sm font-bold uppercase tracking-[0.15em] text-primary-foreground shadow-lift"
                >
                  Open the builder
                </Link>
              </div>
            ) : view === "calendar" ? (
              <div className="rounded-3xl border border-border bg-card p-6 shadow-lift">
                <h2 className="font-display text-xl font-bold">Trip calendar</h2>
                <div className="mt-5 flex justify-center">
                  <Calendar
                    mode="single"
                    numberOfMonths={2}
                    {...(tripRange ? { defaultMonth: tripRange.from, startMonth: tripRange.from } : {})}
                    modifiers={{ ...(tripRange ? { trip: tripRange } : {}), planned: stopDates }}
                    modifiersClassNames={{
                      trip: "bg-primary/15 text-foreground rounded-none",
                      planned: "gradient-sunset !text-primary-foreground font-bold rounded-md",
                    }}
                    className="rounded-2xl border border-border p-4 pointer-events-auto"
                  />
                </div>
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {stops.map((stop, i) => (
                    <div key={stop.id} className="rounded-2xl border border-border p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                        Stop {i + 1}
                      </p>
                      <p className="mt-1 font-display text-lg font-bold">{stop.city.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDay(stop.start_date)} – {formatDay(stop.end_date)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              days.map(([date, dayStops], i) => (
                <article key={date} className="overflow-hidden rounded-3xl border border-border bg-card shadow-lift">
                  <header className="gradient-sunset flex flex-wrap items-center justify-between gap-2 px-6 py-4 text-primary-foreground">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] opacity-80">
                        Day {i + 1}
                      </p>
                      <h2 className="font-display text-xl font-bold">{formatDay(date)}</h2>
                    </div>
                    <p className="inline-flex items-center gap-2 text-sm font-semibold">
                      <MapPin className="size-4" />
                      {dayStops.map((s) => s.city.name).join(" · ")}
                    </p>
                  </header>

                  <div className="space-y-5 p-6">
                    {dayStops.map((stop) => (
                      <div key={stop.id}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="font-display text-lg font-bold">
                            {stop.city.name}
                            <span className="ml-2 text-sm font-normal text-muted-foreground">
                              {stop.city.country}
                            </span>
                          </h3>
                        </div>

                        {stop.activity_ids.length === 0 ? (
                          <p className="mt-2 text-sm text-muted-foreground">
                            Free day — no activities assigned.
                          </p>
                        ) : (
                          <ul className="mt-3 space-y-2">
                            {stop.activity_ids.map((id, idx) => {
                              const a = activityCache[id];
                              if (!a) return null;
                              const startHour = 9 + idx * 3;
                              return (
                                <li
                                  key={id}
                                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="flex min-w-16 items-center gap-1.5 text-sm font-semibold text-primary">
                                      <Clock className="size-3.5" />
                                      {String(startHour).padStart(2, "0")}:00
                                    </span>
                                    <div>
                                      <p className="font-semibold">{a.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {a.type} · {a.duration_hours}h · {a.description}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="text-sm font-bold">{a.cost ? inr(a.cost) : "Free"}</span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </article>
              ))
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
