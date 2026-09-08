import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { DestinationBanner } from "@/components/DestinationBanner";
import { TripCard } from "@/components/TripCard";
import { PackageCard } from "@/components/PackageCard";
import { USE_FAKE_DATA } from "@/config";
import { fakeTrips } from "@/data/fakeTrips";
import { fakePackages } from "@/data/fakePackages";
import { getMyTrips } from "@/api/tripsApi";
import type { TripListItem } from "@/api/types";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — GlobeTrotter" },
      {
        name: "description",
        content:
          "Your GlobeTrotter home: upcoming trips, recommended multi-day packages and budget highlights.",
      },
      { property: "og:title", content: "Dashboard — GlobeTrotter" },
      {
        property: "og:description",
        content: "Upcoming trips, recommended packages and budget highlights.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<TripListItem[]>([]);

  useEffect(() => {
    if (USE_FAKE_DATA) {
      setTrips(fakeTrips);
      return;
    }
    // Backend ready → GET /trips
    getMyTrips()
      .then((res) => setTrips(res.data))
      .catch((err: Error) => toast.error(err.message));
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const upcomingTrips = trips.filter((t) => t.end_date >= today);
  const previousTrips = trips.filter((t) => t.end_date < today);

  return (
    <div className="min-h-screen bg-transparent">
      <Navbar />

      <main className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* Full-viewport Hero Section (first fold only) */}
        <section className="flex min-h-[calc(100vh-4rem)] flex-col justify-center py-8">
          <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
            {/* Left Column: Featured Destination Banner */}
            <div className="lg:col-span-7">
              <DestinationBanner />
            </div>

            {/* Right Column: Headline and CTA */}
            <div className="flex flex-col justify-center space-y-6 lg:col-span-5">
              <div>
                <h1 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl leading-[1.1]">
                  Ready for<br />your next<br />trip?
                </h1>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-gray-300 sm:text-base">
                  Pick a destination, set your dates, and let GlobeTrotter handle
                  the itinerary, the budget, and everything in between.
                </p>
              </div>

              <div>
                <button
                  onClick={() => void navigate({ to: "/create-trip" })}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:opacity-90 active:scale-[0.98]"
                >
                  <Plus className="size-4 stroke-[3]" />
                  Plan a new trip
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Content visible after scrolling down */}
        <div className="space-y-16 pb-16 pt-10">
          {/* Recommended Packages Section */}
          <section className="space-y-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white sm:text-3xl">
                  Recommended packages
                </h2>
                <p className="text-sm text-gray-400">
                  Multi-day plans you can copy and make your own.
                </p>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {fakePackages.map((pack) => (
                <PackageCard key={pack.id} pack={pack} />
              ))}
            </div>
          </section>

          {/* Upcoming Packages / Trips Section (Shown before previous packages) */}
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                Your upcoming packages
              </h2>
              <p className="text-sm text-gray-400">
                {upcomingTrips.length > 0
                  ? `Up next: ${upcomingTrips[0]!.name}`
                  : "No upcoming trips planned yet — start with a new trip."}
              </p>
            </div>
            {upcomingTrips.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {upcomingTrips.map((trip, i) => (
                  <TripCard key={trip.id} trip={trip} index={i + 1} />
                ))}
              </div>
            ) : null}
          </section>

          {/* Previous Packages / Trips Section (Shown after upcoming packages) */}
          {previousTrips.length > 0 ? (
            <section className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white sm:text-3xl">
                  Your previous packages
                </h2>
                <p className="text-sm text-gray-400">
                  Journeys you've already completed.
                </p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {previousTrips.map((trip, i) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    index={upcomingTrips.length + i + 1}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
