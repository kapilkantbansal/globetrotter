from pydantic import BaseModel, EmailStr
from datetime import date
from typing import Optional, List


# ---------- Auth ----------
class UserSignup(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    user_id: int
    email: str
    name: str
    token: str


class LoginOut(BaseModel):
    user_id: int
    name: str
    email: str
    token: str


# ---------- Trip ----------
class TripCreate(BaseModel):
    name: str
    start_date: date
    end_date: date
    description: Optional[str] = None
    cover_photo_url: Optional[str] = None


class TripOut(BaseModel):
    id: int
    name: str
    start_date: date
    end_date: date
    description: Optional[str] = None
    cover_photo_url: Optional[str] = None
    user_id: int
    stop_count: int = 0

    class Config:
        from_attributes = True

    class Config:
        from_attributes = True


# ---------- Stop ----------
class StopCreate(BaseModel):
    city_id: int
    start_date: date
    end_date: date


class StopOut(BaseModel):
    id: int
    trip_id: int
    city_id: int
    start_date: date
    end_date: date

    class Config:
        from_attributes = True


# ---------- City ----------
class CityOut(BaseModel):
    id: int
    name: str
    country: str
    cost_index: int
    popularity: int

    class Config:
        from_attributes = True


class GeoCityOut(BaseModel):
    id: int
    name: str
    state: Optional[str] = None
    country: str
    country_code: Optional[str] = None
    emoji: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    population: Optional[int] = None
    timezone: Optional[str] = None


class CityDetailOut(BaseModel):
    id: Optional[int] = None
    name: str
    state: Optional[str] = None
    country: str
    country_code: Optional[str] = None
    emoji: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    population: Optional[int] = None
    timezone: Optional[str] = None
    cost_index: int = 5
    popularity: int = 5
    image_url: Optional[str] = None
    description: Optional[str] = None


# ---------- Activity ----------
class ActivityOut(BaseModel):
    id: int
    name: str
    type: Optional[str] = None
    cost: float
    duration_hours: Optional[float] = None
    description: Optional[str] = None

    class Config:
        from_attributes = True


class StopActivityCreate(BaseModel):
    activity_id: int

class StopWithActivities(BaseModel):
    id: int
    city_id: int
    start_date: date
    end_date: date
    activity_ids: List[int]

    class Config:
        from_attributes = True