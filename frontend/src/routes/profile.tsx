import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  CalendarDays,
  Heart,
  LogOut,
  MapPin,
  Save,
  Settings2,
  UserRound,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import {
  TRAVEL_STYLES,
  loadFavourites,
  loadProfile,
  saveProfile,
  toggleFavourite,
  type UserProfile,
} from "@/lib/profileStore";
import { loadTrips, tripDays } from "@/lib/tripStore";
import { fakeCities } from "@/data/fakeCities";
import type { TripListItem } from "@/api/types";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — GlobeTrotter" },
      {
        name: "description",
        content:
          "Manage your GlobeTrotter profile: name, age, travel style, previous trips and saved destinations.",
      },
      { property: "og:title", content: "My Profile — GlobeTrotter" },
      {
        property: "og:description",
        content:
          "Update your details, revisit previous trips and manage saved destinations.",
      },
    ],
  }),
  component: ProfilePage,
});

type Tab = "details" | "trips" | "saved";

function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("details");
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    age: null,
    email: "",
    home_city: "",
    bio: "",
    travel_style: "Solo explorer",
  });
  const [favourites, setFavourites] = useState<number[]>([]);
  const [trips, setTrips] = useState<TripListItem[]>([]);

  useEffect(() => {
    const stored = loadProfile();
    setProfile({
      ...stored,
      name: stored.name || user?.name || "",
      email: stored.email || user?.email || "",
    });
    setFavourites(loadFavourites());
    setTrips(loadTrips());
  }, [user]);

  const today = new Date().toISOString().slice(0, 10);
  const past = useMemo(
    () =>
      [...trips]
        .filter((t) => t.end_date < today)
        .sort((a, b) => b.start_date.localeCompare(a.start_date)),
    [trips, today],
  );
  const upcoming = useMemo(
    () => trips.filter((t) => t.end_date >= today),
    [trips, today],
  );

  const savedCities = fakeCities.filter((c) => favourites.includes(c.id));

  const initials = (profile.name || user?.name || "GT")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function handleSave() {
    if (profile.name.trim().length < 2) {
      toast.error("Please enter your name");
      return;
    }
    if (profile.age !== null && (profile.age < 5 || profile.age > 120)) {
      toast.error("Age must be between 5 and 120");
      return;
    }
    saveProfile(profile);
    toast.success("Profile updated");
  }

  function handleLogout() {
    signOut();
    toast.success("Logged out");
    void navigate({ to: "/" });
  }

  const fieldClass =
    "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-5xl px-5 py-10">
        <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-lift">
          <div className="gradient-sunset h-28" />
          <div className="flex flex-wrap items-end gap-5 px-6 pb-6">
            <span className="-mt-12 flex size-24 items-center justify-center rounded-3xl border-4 border-card bg-secondary font-display text-2xl font-extrabold">
              {initials}
            </span>
            <div className="flex-1">
              <h1 className="font-display text-3xl font-extrabold">
                {profile.name || "Your profile"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {profile.email || "no email on file"}
                {profile.home_city ? ` · based in ${profile.home_city}` : ""}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-full border border-destructive/40 px-5 py-2.5 text-sm font-semibold text-destructive transition hover:bg-destructive/10"
            >
              <LogOut className="size-4" />
              Log out
            </button>
          </div>

          <div className="grid grid-cols-3 border-t border-border text-center">
            {(
              [
                ["Trips", trips.length],
                ["Upcoming", upcoming.length],
                ["Saved places", favourites.length],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="px-4 py-4">
                <p className="font-display text-2xl font-extrabold text-gradient-sunset">
                  {value}
                </p>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <nav className="mt-8 flex flex-wrap gap-2">
          {(
            [
              ["details", "Manage profile", Settings2],
              ["trips", "Previous trips", CalendarDays],
              ["saved", "Saved destinations", Heart],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
                tab === key
                  ? "gradient-sunset border-transparent text-primary-foreground shadow-lift"
                  : "border-border hover:bg-secondary"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </nav>

        {tab === "details" ? (
          <section className="mt-6 rounded-3xl border border-border bg-card p-6">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold">
              <UserRound className="size-5 text-primary" />
              Manage profile
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="p-name" className="text-xs font-semibold">
                  Full name
                </label>
                <input
                  id="p-name"
                  value={profile.name}
                  onChange={(e) =>
                    setProfile({ ...profile, name: e.target.value })
                  }
                  className={fieldClass}
                  placeholder="Vasu Sharma"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="p-age" className="text-xs font-semibold">
                  Age
                </label>
                <input
                  id="p-age"
                  type="number"
                  min={5}
                  max={120}
                  value={profile.age ?? ""}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      age: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  className={fieldClass}
                  placeholder="27"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="p-email" className="text-xs font-semibold">
                  Email
                </label>
                <input
                  id="p-email"
                  type="email"
                  value={profile.email}
                  onChange={(e) =>
                    setProfile({ ...profile, email: e.target.value })
                  }
                  className={fieldClass}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="p-home" className="text-xs font-semibold">
                  Home city
                </label>
                <input
                  id="p-home"
                  value={profile.home_city}
                  onChange={(e) =>
                    setProfile({ ...profile, home_city: e.target.value })
                  }
                  className={fieldClass}
                  placeholder="Ahmedabad"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="p-style" className="text-xs font-semibold">
                  Travel style
                </label>
                <select
                  id="p-style"
                  value={profile.travel_style}
                  onChange={(e) =>
                    setProfile({ ...profile, travel_style: e.target.value })
                  }
                  className={fieldClass}
                >
                  {TRAVEL_STYLES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="p-bio" className="text-xs font-semibold">
                  About you
                </label>
                <textarea
                  id="p-bio"
                  rows={3}
                  value={profile.bio}
                  onChange={(e) =>
                    setProfile({ ...profile, bio: e.target.value })
                  }
                  className={fieldClass}
                  placeholder="Mountains over beaches, always chasing street food."
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={handleSave}
                className="gradient-sunset inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-[0.15em] text-primary-foreground shadow-lift transition active:scale-[0.98]"
              >
                <Save className="size-4" />
                Save changes
              </button>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold transition hover:bg-secondary"
              >
                Back to dashboard
              </Link>
            </div>
          </section>
        ) : null}

        {tab === "trips" ? (
          <section className="mt-6 space-y-4">
            {past.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border p-10 text-center">
                <p className="text-muted-foreground">
                  No completed trips yet — your travel history will show up here.
                </p>
                <Link
                  to="/trips"
                  className="mt-4 inline-flex rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition hover:bg-secondary"
                >
                  See all trips
                </Link>
              </div>
            ) : (
              past.map((trip) => (
                <article
                  key={trip.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40"
                >
                  <div>
                    <h3 className="font-display text-lg font-bold">
                      {trip.name}
                    </h3>
                    <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarDays className="size-4 text-primary" />
                      {trip.start_date} → {trip.end_date} · {tripDays(trip)} days
                      · {trip.stop_count} stops
                    </p>
                  </div>
                  <Link
                    to="/itinerary"
                    className="rounded-full border border-border px-4 py-2 text-xs font-bold uppercase tracking-wider transition hover:bg-secondary"
                  >
                    View itinerary
                  </Link>
                </article>
              ))
            )}
          </section>
        ) : null}

        {tab === "saved" ? (
          <section className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {fakeCities.map((city) => {
                const saved = favourites.includes(city.id);
                return (
                  <article
                    key={city.id}
                    className={`rounded-2xl border p-5 transition ${
                      saved
                        ? "border-primary/50 bg-primary/5"
                        : "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-lg font-bold">
                          {city.name}
                        </h3>
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="size-3.5 text-accent" />
                          {city.country}
                        </p>
                      </div>
                      <button
                        aria-label={
                          saved
                            ? `Remove ${city.name} from saved`
                            : `Save ${city.name}`
                        }
                        onClick={() => {
                          const next = toggleFavourite(city.id);
                          setFavourites(next);
                          toast.success(
                            next.includes(city.id)
                              ? `${city.name} saved`
                              : `${city.name} removed`,
                          );
                        }}
                        className="rounded-full border border-border p-2 transition hover:bg-secondary"
                      >
                        <Heart
                          className={`size-4 ${saved ? "fill-current text-primary" : "text-muted-foreground"}`}
                        />
                      </button>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Cost index {city.cost_index}/10 · Popularity{" "}
                      {city.popularity}/10
                    </p>
                  </article>
                );
              })}
            </div>
            {savedCities.length > 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">
                {savedCities.length} destination
                {savedCities.length === 1 ? "" : "s"} saved:{" "}
                {savedCities.map((c) => c.name).join(", ")}
              </p>
            ) : null}
          </section>
        ) : null}
      </main>
    </div>
  );
}
