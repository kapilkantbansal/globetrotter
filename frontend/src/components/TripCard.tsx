import { CalendarDays, MapPin } from "lucide-react";
import type { TripListItem } from "@/api/types";

function formatRange(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const s = new Date(`${start}T00:00:00`).toLocaleDateString("en-GB", opts);
  const e = new Date(`${end}T00:00:00`).toLocaleDateString("en-GB", {
    ...opts,
    year: "numeric",
  });
  return `${s} – ${e}`;
}

export function TripCard({
  trip,
  index,
}: {
  trip: TripListItem;
  index?: number;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const isUpcoming = trip.end_date >= today;

  return (
    <article className="group overflow-hidden rounded-2xl border border-white/10 bg-card/70 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
      {/* Cover image box */}
      <div className="relative h-44 w-full overflow-hidden bg-secondary/40">
        {trip.cover_photo_url ? (
          <img
            src={trip.cover_photo_url}
            alt={trip.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-950/40 via-blue-950/30 to-background/50">
            <MapPin className="size-10 text-primary/40" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider backdrop-blur-md ${
              isUpcoming
                ? "border border-primary/40 bg-primary/20 text-primary"
                : "border border-white/20 bg-black/50 text-gray-300"
            }`}
          >
            {isUpcoming ? "Upcoming" : "Past"}
          </span>
          <span className="rounded-full bg-black/60 px-2.5 py-0.5 text-[11px] font-bold text-gray-200 backdrop-blur-md">
            Trip #{index ?? trip.id}
          </span>
        </div>
      </div>

      {/* Details box below image */}
      <div className="p-5">
        <h3 className="font-display text-lg font-bold text-white capitalize">
          {trip.name}
        </h3>
        <p className="mt-2 flex items-center gap-2 text-sm text-gray-300">
          <CalendarDays className="size-4 shrink-0 text-primary" />
          {formatRange(trip.start_date, trip.end_date)}
        </p>
        <p className="mt-1 flex items-center gap-2 text-sm text-gray-400">
          <MapPin className="size-4 shrink-0 text-accent" />
          {trip.stop_count} {trip.stop_count === 1 ? "stop" : "stops"}
        </p>
      </div>
    </article>
  );
}
