import { Link } from "@tanstack/react-router";
import { Compass, Mail, MapPin, Phone } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-white/10 bg-black/40 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-5 py-12 lg:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* About Us */}
          <div className="space-y-4 sm:col-span-2 lg:col-span-1">
            <Link to="/dashboard" className="flex items-center gap-2">
              <span className="gradient-sunset flex size-8 items-center justify-center rounded-lg">
                <Compass className="size-4 text-primary-foreground" />
              </span>
              <span className="font-display text-lg font-bold text-white">
                GlobeTrotter
              </span>
            </Link>
            <p className="text-xs leading-relaxed text-gray-400">
              GlobeTrotter is your intelligent multi-city travel companion. We
              empower travelers to effortlessly craft day-wise itineraries,
              discover handpicked global packages, and track their travel
              budgets with complete clarity.
            </p>
          </div>

          {/* Explore Us */}
          <div className="space-y-3">
            <h4 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Explore Us
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  to="/trips"
                  className="text-gray-400 transition hover:text-white"
                >
                  My Trips
                </Link>
              </li>
              <li>
                <Link
                  to="/itinerary-builder"
                  className="text-gray-400 transition hover:text-white"
                >
                  Itinerary Builder
                </Link>
              </li>
              <li>
                <Link
                  to="/itinerary"
                  className="text-gray-400 transition hover:text-white"
                >
                  Day-wise Itinerary
                </Link>
              </li>
              <li>
                <Link
                  to="/cities"
                  className="text-gray-400 transition hover:text-white"
                >
                  Cities & Budget
                </Link>
              </li>
              <li>
                <Link
                  to="/activities"
                  className="text-gray-400 transition hover:text-white"
                >
                  Curated Activities
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Us */}
          <div className="space-y-3">
            <h4 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Contact Us
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-400">
              <li className="flex items-start gap-2.5">
                <Mail className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <a
                    href="mailto:support@globetrotter.travel"
                    className="block transition hover:text-white"
                  >
                    support@globetrotter.travel
                  </a>
                  <a
                    href="mailto:hello@globetrotter.com"
                    className="block text-[11px] text-gray-500 transition hover:text-gray-300"
                  >
                    hello@globetrotter.com
                  </a>
                </div>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="size-4 shrink-0 text-primary" />
                <span>+91 (800) 456-2389</span>
              </li>
            </ul>
          </div>

          {/* Address */}
          <div className="space-y-3">
            <h4 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Address
            </h4>
            <div className="flex items-start gap-2.5 text-xs leading-relaxed text-gray-400">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                GlobeTrotter HQ
                <br />
                104 Horizon Plaza, Cyber City
                <br />
                DLF Phase 2, Gurugram
                <br />
                Haryana 122002, India
              </span>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-[11px] text-gray-500 sm:flex-row">
          <p>© 2026 GlobeTrotter. All rights reserved.</p>
          <div className="flex gap-6">
            <span className="cursor-pointer transition hover:text-gray-400">Privacy Policy</span>
            <span className="cursor-pointer transition hover:text-gray-400">Terms of Service</span>
            <span className="cursor-pointer transition hover:text-gray-400">Security</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
