import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  MapPin,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { TripPicker } from "@/components/TripPicker";
import { CityMap } from "@/components/CityMap";
import { loadTrips } from "@/lib/tripStore";
import {
  activityById,
  inr,
  loadStops,
  newStopId,
  saveStops,
  stopCost,
  stopNights,
  tripBudget,
  type StoredStop,
} from "@/lib/itineraryStore";
import { fakeCities } from "@/data/fakeCities";
import { fakeActivities } from "@/data/fakeActivities";
import type { TripListItem } from "@/api/types";

export const Route = createFileRoute("/itinerary-builder")({
  head: () => ({
    meta: [
      { title: "Itinerary Builder — GlobeTrotter" },
      {
        name: "description",
        content:
          "Build your day-wise plan: add stops, pick cities and dates, assign activities and reorder the route.",
      },
      { property: "og:title", content: "Itinerary Builder — GlobeTrotter" },
      {
        property: "og:description",
        content:
          "Add stops, set city dates, assign activities and reorder your multi-city route.",
      },
    ],
  }),
  component: BuilderPage,
});

function BuilderPage() {
  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [tripId, setTripId] = useState<number | null>(null);
  const [stops, setStops] = useState<StoredStop[]>([]);

  const [cityId, setCityId] = useState<number>(fakeCities[0]!.id);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  useEffect(() => {
    const list = loadTrips();
    setTrips(list);
    if (list.length) setTripId(list[0]!.id);
  }, []);

  useEffect(() => {
    if (tripId == null) return;
    setStops(loadStops(tripId));
    const trip = trips.find((t) => t.id === tripId);
    if (trip) {
      setStart(trip.start_date);
      setEnd(trip.start_date);
    }
  }, [tripId, trips]);

  const trip = trips.find((t) => t.id === tripId) ?? null;
  const budget = useMemo(() => tripBudget(stops), [stops]);

  function persist(next: StoredStop[]) {
    setStops(next);
    if (tripId != null) saveStops(tripId, next);
  }

  function handleAddStop() {
    if (tripId == null) return;
    if (!start || !end) {
      toast.error("Pick the arrival and departure dates");
      return;
    }
    if (end < start) {
      toast.error("Departure must be on or after arrival");
      return;
    }
    const city = fakeCities.find((c) => c.id === cityId)!;
    persist([
      ...stops,
      {
        id: newStopId(),
        city,
        start_date: start,
        end_date: end,
        activity_ids: [],
      },
    ]);
    toast.success(`${city.name} added to the route`);
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= stops.length) return;
    const next = [...stops];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item!);
    persist(next);
  }

  function removeStop(id: string) {
    persist(stops.filter((s) => s.id !== id));
  }

  function toggleActivity(stopId: string, activityId: number) {
    persist(
      stops.map((s) =>
        s.id === stopId
          ? {
              ...s,
              activity_ids: s.activity_ids.includes(activityId)
                ? s.activity_ids.filter((a) => a !== activityId)
                : [...s.activity_ids, activityId],
            }
          : s,
      ),
    );
  }

  function updateDates(stopId: string, patch: Partial<StoredStop>) {
    persist(stops.map((s) => (s.id === stopId ? { ...s, ...patch } : s)));
  }

  const fieldClass =
    "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-6xl px-5 py-10">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
          Step 2 of 3
        </p>
        <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">
          Itinerary <span className="text-gradient-sunset">Builder</span>
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Add a stop for every city, set the dates you'll be there, tick the
          activities you want and drag the order around until it flows.
        </p>

        <div className="mt-8">
          <CityMap
            cities={fakeCities}
            selectedId={cityId}
            onSelect={(city) => {
              setCityId(city.id);
              toast.success(`${city.name} selected — set the dates and add it`);
            }}
            routeIds={stops.map((s) => s.city.id)}
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <TripPicker trips={trips} value={tripId} onChange={setTripId} />

            {trip ? (
              <section className="rounded-2xl border border-border bg-card p-5 shadow-lift">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                  <Plus className="size-4 text-primary" />
                  Add stop
                </h2>
                <div className="mt-4 space-y-3">
                  <div className="space-y-1.5">
                    <label htmlFor="stop-city" className="text-xs font-semibold">
                      City
                    </label>
                    <select
                      id="stop-city"
                      value={cityId}
                      onChange={(e) => setCityId(Number(e.target.value))}
                      className={fieldClass}
                    >
                      {fakeCities.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}, {c.country}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label htmlFor="stop-start" className="text-xs font-semibold">
                        Arrive
                      </label>
                      <input
                        id="stop-start"
                        type="date"
                        value={start}
                        min={trip.start_date}
                        max={trip.end_date}
                        onChange={(e) => setStart(e.target.value)}
                        className={fieldClass}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="stop-end" className="text-xs font-semibold">
                        Depart
                      </label>
                      <input
                        id="stop-end"
                        type="date"
                        value={end}
                        min={start || trip.start_date}
                        max={trip.end_date}
                        onChange={(e) => setEnd(e.target.value)}
                        className={fieldClass}
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleAddStop}
                    className="gradient-sunset inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold uppercase tracking-[0.15em] text-primary-foreground shadow-lift transition active:scale-[0.98]"
                  >
                    <Plus className="size-4" />
                    Add stop
                  </button>
                  <Link
                    to="/cities"
                    className="block text-center text-xs font-semibold text-primary hover:underline"
                  >
                    Browse all cities & budget →
                  </Link>
                </div>
              </section>
            ) : null}

            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                <Wallet className="size-4 text-primary" />
                Running budget
              </h2>
              <p className="mt-2 text-3xl font-extrabold text-gradient-sunset">
                {inr(budget.total)}
              </p>
              <p className="text-xs text-muted-foreground">
                {budget.days} days · {inr(budget.avgPerDay)} / day
              </p>
              <dl className="mt-4 space-y-2 text-sm">
                {(
                  [
                    ["Activities", budget.activities],
                    ["Stay", budget.stay],
                    ["Transport", budget.transport],
                    ["Meals", budget.meals],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-semibold">{inr(value)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </aside>

          <section className="space-y-4">
            {stops.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
                <MapPin className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-3 font-display text-lg font-bold">
                  No stops yet
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add your first city on the left to start the route.
                </p>
              </div>
            ) : null}

            {stops.map((stop, index) => (
              <article
                key={stop.id}
                className="rounded-3xl border border-border bg-card p-5 shadow-lift transition hover:border-primary/40"
              >
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="gradient-sunset flex size-10 items-center justify-center rounded-2xl font-display text-sm font-bold text-primary-foreground">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="font-display text-xl font-bold">
                        {stop.city.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {stop.city.country} · {stopNights(stop)} days ·{" "}
                        {inr(stopCost(stop))} activities
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => move(index, -1)}
                      aria-label={`Move ${stop.city.name} earlier`}
                      disabled={index === 0}
                      className="rounded-full border border-border p-2 transition hover:bg-secondary disabled:opacity-40"
                    >
                      <ArrowUp className="size-4" />
                    </button>
                    <button
                      onClick={() => move(index, 1)}
                      aria-label={`Move ${stop.city.name} later`}
                      disabled={index === stops.length - 1}
                      className="rounded-full border border-border p-2 transition hover:bg-secondary disabled:opacity-40"
                    >
                      <ArrowDown className="size-4" />
                    </button>
                    <button
                      onClick={() => removeStop(stop.id)}
                      aria-label={`Remove ${stop.city.name}`}
                      className="rounded-full border border-border p-2 text-destructive transition hover:bg-destructive/10"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </header>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label
                      htmlFor={`${stop.id}-start`}
                      className="text-xs font-semibold"
                    >
                      <CalendarDays className="mr-1 inline size-3.5 text-primary" />
                      Arrive
                    </label>
                    <input
                      id={`${stop.id}-start`}
                      type="date"
                      value={stop.start_date}
                      onChange={(e) =>
                        updateDates(stop.id, { start_date: e.target.value })
                      }
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor={`${stop.id}-end`}
                      className="text-xs font-semibold"
                    >
                      <CalendarDays className="mr-1 inline size-3.5 text-primary" />
                      Depart
                    </label>
                    <input
                      id={`${stop.id}-end`}
                      type="date"
                      value={stop.end_date}
                      min={stop.start_date}
                      onChange={(e) =>
                        updateDates(stop.id, { end_date: e.target.value })
                      }
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Activities
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {fakeActivities.map((a) => {
                      const on = stop.activity_ids.includes(a.id);
                      return (
                        <button
                          key={a.id}
                          onClick={() => toggleActivity(stop.id, a.id)}
                          aria-pressed={on}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                            on
                              ? "gradient-sunset border-transparent text-primary-foreground"
                              : "border-border hover:bg-secondary"
                          }`}
                        >
                          {on ? <Check className="size-3.5" /> : null}
                          {a.name}
                          <span className="opacity-70">
                            {a.cost ? inr(a.cost) : "Free"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {stop.activity_ids.length ? (
                    <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                      {stop.activity_ids.map((id) => {
                        const a = activityById(id);
                        if (!a) return null;
                        return (
                          <li key={id} className="flex justify-between">
                            <span>
                              {a.name} · {a.duration_hours}h
                            </span>
                            <span className="font-semibold text-foreground">
                              {a.cost ? inr(a.cost) : "Free"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              </article>
            ))}

            {stops.length ? (
              <Link
                to="/itinerary"
                className="gradient-sunset inline-flex rounded-full px-6 py-3 text-sm font-bold uppercase tracking-[0.15em] text-primary-foreground shadow-lift"
              >
                View itinerary
              </Link>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}
