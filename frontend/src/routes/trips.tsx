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
import { loadTrips, saveTrips, tripDays, getActiveTripId, setActiveTripId } from "@/lib/tripStore";
import { loadStops } from "@/lib/itineraryStore";
import type { TripListItem } from "@/api/types";

export const Route = createFileRoute("/trips")({
  head: () => ({
    meta: [
      { title: "My Trips — GlobeTrotter" },
      {
        name: "description",
        content:
          "Manage your travel itineraries, view interactive trip calendars, and customize planned destinations.",
      },
      { property: "og:title", content: "My Trips — GlobeTrotter" },
      {
        property: "og:description",
        content:
          "Manage your travel itineraries, view interactive trip calendars, and customize planned destinations.",
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
    function pickInitial(list: TripListItem[]) {
      setTrips(list);
      if (list.length > 0) {
        const saved = getActiveTripId();
        const found = list.find((t) => t.id === saved);
        setSelectedId(found ? found.id : list[0]!.id);
      }
    }

    if (USE_FAKE_DATA) {
      pickInitial(loadTrips());
      return;
    }
    getMyTrips()
      .then((res) => {
        pickInitial(res.data);
      })
      .catch((err: Error) => toast.error(err.message));
  }, []);

  useEffect(() => {
    if (selectedId != null) {
      setActiveTripId(selectedId);
    }
  }, [selectedId]);

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
      if (sort === "stops") {
        const aCount = Math.max(a.stop_count, loadStops(a.id).length);
        const bCount = Math.max(b.stop_count, loadStops(b.id).length);
        return bCount - aCount;
      }
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

  const totalStops = trips.reduce(
    (sum, t) => sum + Math.max(t.stop_count, loadStops(t.id).length),
    0
  );

  const activeTrip =
    visible.find((t) => t.id === selectedId) ?? visible[0] ?? null;
  const activeIndex = visible.findIndex((t) => t.id === activeTrip?.id);
  const selectedStops = useMemo(
    () =>
      activeTrip == null
        ? []
        : loadStops(activeTrip.id).map((s2) => s2.city.name),
    [activeTrip]
  );
  const activeStopCount = activeTrip
    ? Math.max(activeTrip.stop_count, selectedStops.length)
    : 0;

  return (
    <div className="min-h-screen bg-transparent">
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

        {visible.length === 0 ? (
          <div className="mt-12 rounded-3xl border border-dashed border-white/15 bg-card/60 p-12 text-center backdrop-blur-md">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-secondary/80 text-muted-foreground">
              <CalendarDays className="size-7 text-primary" />
            </div>
            <h3 className="mt-4 font-display text-xl font-bold text-white">
              {filter === "past" ? "No trips completed" : "No trips found"}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {filter === "past"
                ? "You don't have any completed trips yet. When your trips pass their end date, they will appear here."
                : "No trips matched your search. Start a new itinerary to get going."}
            </p>
            <div className="mt-6">
              <Link
                to="/create-trip"
                className="gradient-sunset inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lift transition hover:opacity-90 active:scale-95"
              >
                <Plus className="size-4" /> Create a trip
              </Link>
            </div>
          </div>
        ) : (
          <section className="mt-8 space-y-4">
            {/* Trip selector tabs */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">
                Select Trip:
              </span>
              {visible.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`rounded-full border px-4 py-1.5 text-xs font-semibold capitalize transition ${
                    activeTrip?.id === t.id
                      ? "gradient-sunset border-transparent text-primary-foreground shadow-lift"
                      : "border-border/70 bg-card/70 text-gray-300 hover:bg-secondary hover:text-white"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>

            <div className="grid items-start gap-6 lg:grid-cols-2">
              {/* Left Column: Trip Box */}
              {activeTrip && (
                <article className="overflow-hidden rounded-3xl border border-white/15 bg-card/85 shadow-2xl backdrop-blur-xl">
                  {/* Cover image box */}
                  <div className="relative h-56 w-full overflow-hidden bg-secondary/40">
                    {activeTrip.cover_photo_url ? (
                      <img
                        src={activeTrip.cover_photo_url}
                        alt={activeTrip.name}
                        className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-950/40 via-blue-950/30 to-background/50">
                        <MapPin className="size-12 text-primary/40" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />

                    <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider backdrop-blur-md ${
                          activeTrip.end_date >= today
                            ? "border border-primary/40 bg-primary/20 text-primary"
                            : "border border-white/20 bg-black/50 text-gray-300"
                        }`}
                      >
                        {activeTrip.end_date >= today ? "Upcoming" : "Past"}
                      </span>
                      <span className="rounded-full bg-black/60 px-2.5 py-0.5 text-[11px] font-bold text-gray-200 backdrop-blur-md">
                        Trip #{activeIndex + 1}
                      </span>
                    </div>
                  </div>

                  {/* Trip Details */}
                  <div className="p-6">
                    <div className="flex items-center justify-between gap-3">
                      {editingId === activeTrip.id ? (
                        <input
                          value={draftName}
                          autoFocus
                          onChange={(e) => setDraftName(e.target.value)}
                          onBlur={() => saveRename(activeTrip)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveRename(activeTrip);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          aria-label="Trip name"
                          className="w-full rounded-lg border border-border bg-background px-3 py-1.5 font-display text-xl font-bold outline-none focus:border-primary"
                        />
                      ) : (
                        <h2 className="font-display text-2xl font-bold capitalize text-white">
                          {activeTrip.name}
                        </h2>
                      )}
                    </div>

                    <p className="mt-2 flex items-center gap-2 text-sm text-gray-300">
                      <CalendarDays className="size-4 shrink-0 text-primary" />
                      {formatRange(activeTrip.start_date, activeTrip.end_date)} · {tripDays(activeTrip)} days
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-sm text-gray-400">
                      <MapPin className="size-4 shrink-0 text-accent" />
                      {activeStopCount}{" "}
                      {activeStopCount === 1 ? "destination" : "destinations"}
                    </p>

                    <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {(
                        [
                          ["Start", activeTrip.start_date],
                          ["End", activeTrip.end_date],
                          ["Days", String(tripDays(activeTrip))],
                          ["Stops", String(activeStopCount)],
                        ] as const
                      ).map(([label, value]) => (
                        <div key={label} className="rounded-xl bg-secondary/50 border border-white/5 p-3">
                          <dt className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                            {label}
                          </dt>
                          <dd className="mt-1 text-sm font-semibold">{value}</dd>
                        </div>
                      ))}
                    </dl>

                    {selectedStops.length === 0 ? (
                      <p className="mt-5 rounded-xl border border-dashed border-border/60 p-4 text-xs text-muted-foreground">
                        No destinations added for this trip yet.{" "}
                        <Link to="/cities" className="font-semibold text-primary hover:underline">
                          Add destinations in Cities →
                        </Link>
                      </p>
                    ) : (
                      <ol className="mt-5 space-y-2">
                        {selectedStops.map((name, i) => (
                          <li key={`${name}-${i}`} className="flex items-center gap-3 text-sm">
                            <span className="gradient-sunset flex size-6 items-center justify-center rounded-full text-[0.65rem] font-bold text-primary-foreground">
                              {i + 1}
                            </span>
                            {name}
                          </li>
                        ))}
                      </ol>
                    )}

                    {/* Action buttons */}
                    <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border/40 pt-4">
                      <button
                        onClick={() => void navigate({ to: "/itinerary" })}
                        className="rounded-full border border-border px-4 py-2 text-xs font-bold uppercase tracking-wider transition hover:bg-secondary"
                      >
                        View Itinerary
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(activeTrip.id);
                          setDraftName(activeTrip.name);
                        }}
                        aria-label={`Rename ${activeTrip.name}`}
                        className="rounded-full border border-border p-2 transition hover:bg-secondary"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(activeTrip)}
                        aria-label={`Duplicate ${activeTrip.name}`}
                        className="rounded-full border border-border p-2 transition hover:bg-secondary"
                      >
                        <Copy className="size-4" />
                      </button>
                      <button
                        onClick={() => void handleDelete(activeTrip)}
                        aria-label={`Delete ${activeTrip.name}`}
                        className="rounded-full border border-border p-2 text-destructive transition hover:bg-destructive/10 ml-auto"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </article>
              )}

              {/* Right Column: Trip Calendar */}
              <TripCalendar trip={activeTrip} stopNames={selectedStops} />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
