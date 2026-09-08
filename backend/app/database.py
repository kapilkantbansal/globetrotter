import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
GEO_DATABASE_URL = os.getenv(
    "GEO_DATABASE_URL",
    "postgresql://postgres:focused_man@localhost:5432/countries_states_cities"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

geo_engine = create_engine(GEO_DATABASE_URL, pool_size=10, max_overflow=20)
GeoSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=geo_engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_geo_db():
    db = GeoSessionLocal()
    try:
        yield db
    finally:
        db.close()