import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  CalendarDays,
  Copy,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { TripCalendar } from "@/components/TripCalendar";
import { USE_FAKE_DATA } from "@/config";
import { getMyTrips, deleteTrip } from "@/api/tripsApi";
import { loadTrips, saveTrips, tripDays } from "@/lib/tripStore";
import { loadStops } from "@/lib/itineraryStore";
import type { TripListItem } from "@/api/types";

export const Route = createFileRoute("/trips")({
  head: () => ({
    meta: [
      { title: "My Trips — GlobeTrotter" },
      {
        name: "description",
        content:
          "All your GlobeTrotter trips in one list: dates, stop counts, and quick edit, duplicate or delete actions.",
      },
      { property: "og:title", content: "My Trips — GlobeTrotter" },
      {
        property: "og:description",
        content: "Manage every trip you've planned — dates, stops and actions.",
      },
    ],
  }),
  component: TripsPage,
});

type Filter = "all" | "upcoming" | "past";
type Sort = "date" | "name" | "stops";

function formatRange(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const s = new Date(`${start}T00:00:00`).toLocaleDateString("en-GB", opts);
  const e = new Date(`${end}T00:00:00`).toLocaleDateString("en-GB", {
    ...opts,
    year: "numeric",
  });
  return `${s} – ${e}`;
}

function TripsPage() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("date");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draftName, setDraftName] = useState("");

  useEffect(() => {
    if (USE_FAKE_DATA) {
      const list = loadTrips();
      setTrips(list);
      if (list.length) setSelectedId(list[0]!.id);
      return;
    }
    getMyTrips()
      .then((res) => {
        setTrips(res.data);
        if (res.data.length) setSelectedId(res.data[0]!.id);
      })
      .catch((err: Error) => toast.error(err.message));
  }, []);

  function persist(next: TripListItem[]) {
    setTrips(next);
    if (USE_FAKE_DATA) saveTrips(next);
  }

  const today = new Date().toISOString().slice(0, 10);

  const visible = useMemo(() => {
    const list = trips.filter((t) => {
      const matchesQuery = t.name.toLowerCase().includes(query.toLowerCase());
      const matchesFilter =
        filter === "all" ||
        (filter === "upcoming" ? t.end_date >= today : t.end_date < today);
      return matchesQuery && matchesFilter;
    });
    return [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "stops") return b.stop_count - a.stop_count;
      return a.start_date.localeCompare(b.start_date);
    });
  }, [trips, query, filter, sort, today]);

  async function handleDelete(trip: TripListItem) {
    if (!window.confirm(`Delete "${trip.name}"? This can't be undone.`)) return;
    try {
      if (!USE_FAKE_DATA) await deleteTrip(trip.id);
      persist(trips.filter((t) => t.id !== trip.id));
      toast.success(`${trip.name} deleted`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  function handleDuplicate(trip: TripListItem) {
    const copy: TripListItem = {
      ...trip,
      id: trips.reduce((max, t) => Math.max(max, t.id), 0) + 1,
      name: `${trip.name} (copy)`,
    };
    persist([copy, ...trips]);
    toast.success(`Duplicated ${trip.name}`);
  }

  function saveRename(trip: TripListItem) {
    const name = draftName.trim();
    if (name.length < 3) {
      toast.error("Name needs at least 3 characters");
      return;
    }
    persist(trips.map((t) => (t.id === trip.id ? { ...t, name } : t)));
    setEditingId(null);
    toast.success("Trip renamed");
  }

  const totalStops = trips.reduce((sum, t) => sum + t.stop_count, 0);

  const selectedTrip = trips.find((t) => t.id === selectedId) ?? null;
  const selectedStops = useMemo(
    () =>
      selectedId == null
        ? []
        : loadStops(selectedId).map((s2) => s2.city.name),
    [selectedId, trips],
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
              Trip list
            </p>
            <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">
              My <span className="text-gradient-sunset">Trips</span>
            </h1>
            <p className="mt-3 text-muted-foreground">
              {trips.length} {trips.length === 1 ? "trip" : "trips"} ·{" "}
              {totalStops} destinations planned
            </p>
          </div>
          <Link
            to="/create-trip"
            className="gradient-sunset inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-[0.15em] text-primary-foreground shadow-lift transition active:scale-[0.98]"
          >
            <Plus className="size-4" />
            New trip
          </Link>
        </div>

        <section className="mt-8 flex flex-wrap items-center gap-3">
          <label className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your trips"
              aria-label="Search trips"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>

          <div className="flex gap-2">
            {(["all", "upcoming", "past"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                  filter === f
                    ? "gradient-sunset border-transparent text-primary-foreground"
                    : "border-border hover:bg-secondary"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            aria-label="Sort trips"
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none"
          >
            <option value="date">Sort: date</option>
            <option value="name">Sort: name</option>
            <option value="stops">Sort: stops</option>
          </select>
        </section>

        <section className="mt-8 grid items-start gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-border bg-card p-6">
            <h2 className="font-display text-xl font-bold">Trip calendar</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a trip to see its dates on the calendar and watch the drive
              from your first stop to the final destination.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {trips.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                    selectedId === t.id
                      ? "gradient-sunset border-transparent text-primary-foreground shadow-lift"
                      : "border-border hover:bg-secondary"
                  }`}
                >
                  {t.name}
                </button>
              ))}
              {trips.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No trips yet — create one to fill the calendar.
                </p>
              ) : null}
            </div>

            {selectedTrip ? (
              <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {(
                  [
                    ["Start", selectedTrip.start_date],
                    ["End", selectedTrip.end_date],
                    ["Days", String(tripDays(selectedTrip))],
                    ["Stops", String(selectedTrip.stop_count)],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-secondary/60 p-3">
                    <dt className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="mt-1 text-sm font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {selectedStops.length === 0 && selectedTrip ? (
              <p className="mt-6 rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                No stops saved for this trip yet.{" "}
                <Link to="/itinerary-builder" className="font-semibold text-primary hover:underline">
                  Add cities in the Builder →
                </Link>
              </p>
            ) : null}

            {selectedStops.length > 0 ? (
              <ol className="mt-6 space-y-2">
                {selectedStops.map((name, i) => (
                  <li key={`${name}-${i}`} className="flex items-center gap-3 text-sm">
                    <span className="gradient-sunset flex size-6 items-center justify-center rounded-full text-[0.65rem] font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    {name}
                  </li>
                ))}
              </ol>
            ) : null}
          </div>

          <TripCalendar trip={selectedTrip} stopNames={selectedStops} />
        </section>

        <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((trip) => (
            <article
              key={trip.id}
              className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-1 hover:shadow-lift"
            >
              <div>
                {editingId === trip.id ? (
                  <input
                    value={draftName}
                    autoFocus
                    onChange={(e) => setDraftName(e.target.value)}
                    onBlur={() => saveRename(trip)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveRename(trip);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    aria-label="Trip name"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 font-display text-lg font-bold outline-none focus:border-primary"
                  />
                ) : (
                  <h2 className="font-display text-lg font-bold">
                    {trip.name}
                  </h2>
                )}
                <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="size-4 text-primary" />
                  {formatRange(trip.start_date, trip.end_date)} ·{" "}
                  {tripDays(trip)} days
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="size-4 text-accent" />
                  {trip.stop_count}{" "}
                  {trip.stop_count === 1 ? "destination" : "destinations"}
                </p>
                <span
                  className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                    trip.end_date >= today
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {trip.end_date >= today ? "Upcoming" : "Completed"}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => void navigate({ to: "/itinerary" })}
                  className="rounded-full border border-border px-4 py-2 text-xs font-bold uppercase tracking-wider transition hover:bg-secondary"
                >
                  View
                </button>
                <button
                  onClick={() => {
                    setSelectedId(trip.id);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  aria-label={`Open calendar for ${trip.name}`}
                  className="rounded-full border border-border p-2 transition hover:bg-secondary"
                >
                  <CalendarDays className="size-4" />
                </button>
                <button
                  onClick={() => {
                    setEditingId(trip.id);
                    setDraftName(trip.name);
                  }}
                  aria-label={`Rename ${trip.name}`}
                  className="rounded-full border border-border p-2 transition hover:bg-secondary"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  onClick={() => handleDuplicate(trip)}
                  aria-label={`Duplicate ${trip.name}`}
                  className="rounded-full border border-border p-2 transition hover:bg-secondary"
                >
                  <Copy className="size-4" />
                </button>
                <button
                  onClick={() => void handleDelete(trip)}
                  aria-label={`Delete ${trip.name}`}
                  className="rounded-full border border-border p-2 text-destructive transition hover:bg-destructive/10"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </article>
          ))}
        </section>

        {visible.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-border p-10 text-center">
            <p className="text-muted-foreground">
              No trips here yet. Start your first itinerary.
            </p>
            <Link
              to="/create-trip"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition hover:bg-secondary"
            >
              <Plus className="size-4" /> Create a trip
            </Link>
          </div>
        ) : null}
      </main>
    </div>
  );
}
