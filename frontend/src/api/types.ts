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
  region?: string;
  cost_index: number;
  popularity: number;
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
