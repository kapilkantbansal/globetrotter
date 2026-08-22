// Local demo store for the user profile + favourite destinations.
// Shapes stay flat so a backend swap is a one-line change.

export interface UserProfile {
  name: string;
  age: number | null;
  email: string;
  home_city: string;
  bio: string;
  travel_style: string;
}

const PROFILE_KEY = "globetrotter.profile";
const FAV_KEY = "globetrotter.favourites";

export const TRAVEL_STYLES = [
  "Backpacker",
  "Comfort seeker",
  "Luxury",
  "Family",
  "Solo explorer",
  "Foodie",
] as const;

function isBrowser() {
  return typeof window !== "undefined";
}

export const emptyProfile: UserProfile = {
  name: "",
  age: null,
  email: "",
  home_city: "",
  bio: "",
  travel_style: "Solo explorer",
};

export function loadProfile(): UserProfile {
  if (!isBrowser()) return emptyProfile;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (raw) return { ...emptyProfile, ...(JSON.parse(raw) as UserProfile) };
  } catch {
    /* ignore */
  }
  return emptyProfile;
}

export function saveProfile(profile: UserProfile) {
  if (!isBrowser()) return;
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function loadFavourites(): number[] {
  if (!isBrowser()) return [];
  try {
    return JSON.parse(window.localStorage.getItem(FAV_KEY) ?? "[]") as number[];
  } catch {
    return [];
  }
}

export function saveFavourites(ids: number[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(FAV_KEY, JSON.stringify(ids));
}

export function toggleFavourite(cityId: number): number[] {
  const current = loadFavourites();
  const next = current.includes(cityId)
    ? current.filter((id) => id !== cityId)
    : [...current, cityId];
  saveFavourites(next);
  return next;
}
