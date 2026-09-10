// Shapes match the GlobeTrotter API contract exactly (snake_case).

export interface SignupResponse {
  user_id: number;
  email: string;
  name: string;
  token: string;
}

export interface LoginResponse {
  user_id: number;
  token: string;
}

export interface TripListItem {
  id: number;
  name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  stop_count: number;
  cover_photo_url?: string | null;
  description?: string | null;
}

export interface TripCreateInput {
  name: string;
  start_date: string;
  end_date: string;
  description: string;
  cover_photo_url: string | null;
}

export interface Trip extends TripCreateInput {
  id: number;
  user_id: number;
}

export interface City {
  id: number;
  name: string;
  country: string;
  region?: string | undefined;
  cost_index: number;
  popularity: number;
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
  image_url?: string | null | undefined;
  description?: string | null | undefined;
}

export interface GeoCitySearchResult {
  id: number;
  name: string;
  state?: string | null;
  country: string;
  country_code?: string | null;
  emoji?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  population?: number | null;
  timezone?: string | null;
}

export interface CityDetail {
  id?: number | null | undefined;
  name: string;
  state?: string | null | undefined;
  country: string;
  country_code?: string | null | undefined;
  emoji?: string | null | undefined;
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
  population?: number | null | undefined;
  timezone?: string | null | undefined;
  cost_index: number;
  popularity: number;
  image_url?: string | null | undefined;
  description?: string | null | undefined;
}

export interface Activity {
  id: number;
  name: string;
  type: string;
  cost: number;
  duration_hours: number;
  description: string;
}

export interface Stop {
  id: number;
  city: Pick<City, "id" | "name" | "country">;
  start_date: string;
  end_date: string;
  activities: Pick<Activity, "id" | "name" | "cost" | "duration_hours">[];
}

export interface TripDetail {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  description: string;
  stops: Stop[];
}

export interface Budget {
  trip_id: number;
  total_cost: number;
  breakdown: {
    activities: number;
    stay: number;
    transport: number;
    meals: number;
  };
  avg_cost_per_day: number;
  days: number;
}

export interface StopWithActivities {
  id: number;
  city_id: number;
  start_date: string;
  end_date: string;
  activity_ids: number[];
}