import { Link, useNavigate } from "@tanstack/react-router";
import { Compass, LogOut, Menu, UserRound } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/trips", label: "My Trips" },
  { to: "/itinerary-builder", label: "Builder" },
  { to: "/itinerary", label: "Itinerary" },
  { to: "/cities", label: "Cities & Budget" },
  { to: "/activities", label: "Activities" },
  { to: "/profile", label: "Profile" },
] as const;

export function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const linkClass =
    "rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground";

  const initials = (user?.name ?? "GT")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-5">
        <Link to="/dashboard" className="flex shrink-0 items-center gap-2">
          <span className="gradient-sunset flex size-9 items-center justify-center rounded-xl">
            <Compass className="size-5 text-primary-foreground" />
          </span>
          <span className="font-display text-lg font-bold">GlobeTrotter</span>
        </Link>

        <div className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={linkClass}
              activeProps={{
                className:
                  "rounded-full bg-secondary px-3 py-2 text-sm font-semibold text-foreground",
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
          <ThemeToggle />

          <Link
            to="/profile"
            aria-label="Open your profile"
            className="flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3 transition hover:bg-secondary"
          >
            <span className="gradient-sunset flex size-7 items-center justify-center rounded-full text-[0.7rem] font-bold text-primary-foreground">
              {initials}
            </span>
            <span className="hidden text-sm font-semibold sm:inline">
              {user ? user.name.split(" ")[0] : "Guest"}
            </span>
            <UserRound className="size-4 text-muted-foreground sm:hidden" />
          </Link>

          <button
            onClick={() => {
              signOut();
              void navigate({ to: "/" });
            }}
            aria-label="Log out"
            className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm font-semibold transition hover:bg-secondary"
          >
            <LogOut className="size-4" />
          </button>

          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
            className="rounded-full border border-border p-2 lg:hidden"
          >
            <Menu className="size-4" />
          </button>
        </div>
      </nav>

      {open ? (
        <div className="border-t border-border bg-background px-5 py-3 lg:hidden">
          <div className="flex flex-wrap justify-around gap-2">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={linkClass}
                activeProps={{
                  className:
                    "rounded-full bg-secondary px-3 py-2 text-sm font-semibold text-foreground",
                }}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
