import instance from "./axiosInstance";
import type { City, GeoCitySearchResult, CityDetail } from "./types";

export const searchCities = (search: string) =>
  instance.get<City[]>("/cities", { params: { search } });

export const searchGeoCities = (query: string, limit = 15) =>
  instance.get<GeoCitySearchResult[]>("/cities/search", { params: { query, limit } });

export const getCityDetails = (
  name?: string,
  country?: string,
  state?: string,
  city_id?: number
) =>
  instance.get<CityDetail>("/cities/details", {
    params: { name, country, state, city_id },
  });

