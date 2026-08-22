import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Car, Flag, MapPin } from "lucide-react";
import type { TripListItem } from "@/api/types";

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function monthLabel(d: Date) {
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

interface TripCalendarProps {
  trip: TripListItem | null;
  stopNames?: string[];
}

/**
 * Month calendar that highlights the selected trip's date range, plus a
 * "drive" progress track where a car travels from the start city to the
 * destination based on how far along the trip is.
 */
export function TripCalendar({ trip, stopNames = [] }: TripCalendarProps) {
  const [cursor, setCursor] = useState<Date>(() =>
    trip ? new Date(`${trip.start_date}T00:00:00`) : new Date(),
  );
  const [anchor, setAnchor] = useState<string | null>(trip?.start_date ?? null);

  // Re-anchor the visible month whenever the picked trip changes.
  if (trip && anchor !== trip.start_date) {
    setAnchor(trip.start_date);
    setCursor(new Date(`${trip.start_date}T00:00:00`));
  }

  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startPad = (first.getDay() + 6) % 7; // Monday-first
    const total = new Date(
      cursor.getFullYear(),
      cursor.getMonth() + 1,
      0,
    ).getDate();
    const cells: (Date | null)[] = Array.from({ length: startPad }, () => null);
    for (let i = 1; i <= total; i += 1) {
      cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), i));
    }
    return cells;
  }, [cursor]);

  const today = toISO(new Date());

  const progress = useMemo(() => {
    if (!trip) return 0;
    const start = new Date(`${trip.start_date}T00:00:00`).getTime();
    const end = new Date(`${trip.end_date}T00:00:00`).getTime();
    const now = Date.now();
    if (now <= start) return 0;
    if (now >= end) return 1;
    return (now - start) / Math.max(1, end - start);
  }, [trip]);

  const origin = stopNames[0] ?? "Home";
  const destination = stopNames[stopNames.length - 1] ?? "Destination";

  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-lift">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex min-w-0 items-center gap-2 font-display text-lg font-bold">
          <CalendarDays className="size-4 shrink-0 text-primary" />
          <span className="truncate">
          {trip ? trip.name : "Trip calendar"}
          </span>
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() =>
              setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
            }
            className="rounded-full border border-border p-1.5 transition hover:bg-secondary"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-[9.5rem] text-center text-sm font-semibold">
            {monthLabel(cursor)}
          </span>
          <button
            type="button"
            aria-label="Next month"
            onClick={() =>
              setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
            }
            className="rounded-full border border-border p-1.5 transition hover:bg-secondary"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          if (!d) return <span key={`pad-${i}`} />;
          const iso = toISO(d);
          const inTrip =
            !!trip && iso >= trip.start_date && iso <= trip.end_date;
          const isStart = !!trip && iso === trip.start_date;
          const isEnd = !!trip && iso === trip.end_date;
          const isToday = iso === today;

          const base =
            "flex aspect-square items-center justify-center rounded-xl text-sm transition";
          const style = isStart || isEnd
            ? "gradient-sunset font-bold text-primary-foreground shadow-lift"
            : inTrip
              ? "bg-primary/15 font-semibold text-foreground"
              : isToday
                ? "border border-primary/50 font-semibold"
                : "text-muted-foreground hover:bg-secondary";

          return (
            <span key={iso} className={`${base} ${style}`} title={iso}>
              {d.getDate()}
            </span>
          );
        })}
      </div>

      {/* Drive-to-destination track */}
      <div className="mt-6">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5 text-primary" />
            {origin}
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Flag className="size-3.5 text-accent" />
            {destination}
          </span>
        </div>

        <div className="relative mt-3 h-12">
          <div className="absolute inset-x-0 top-7 h-2 rounded-full bg-secondary" />
          <div
            className="gradient-sunset absolute left-0 top-7 h-2 rounded-full transition-[width] duration-1000 ease-out"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
          <div
            className="absolute top-0 transition-[left] duration-1000 ease-out"
            style={{
              left: `calc(${Math.round(progress * 100)}% - 1.25rem)`,
            }}
          >
            <span className="gradient-sunset flex size-10 items-center justify-center rounded-full shadow-lift">
              <Car className="size-5 text-primary-foreground" />
            </span>
          </div>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          {trip
            ? progress === 0
              ? "Engine warming up — the trip hasn't started yet."
              : progress === 1
                ? "Journey complete. Hope it was a good one."
                : `${Math.round(progress * 100)}% of the way to ${destination}.`
            : "Pick a trip to see its dates and journey progress."}
        </p>
      </div>
    </div>
  );
}
