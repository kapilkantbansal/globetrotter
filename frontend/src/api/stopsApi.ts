import instance from "./axiosInstance";

export interface AddStopInput {
  city_id: number;
  start_date: string;
  end_date: string;
}

export const addStop = (tripId: number, data: AddStopInput) =>
  instance.post(`/trips/${tripId}/stops`, data);

export const removeStop = (tripId: number, stopId: number) =>
  instance.delete<void>(`/trips/${tripId}/stops/${stopId}`);
