import urllib.request
import urllib.parse
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db, get_geo_db
from app import models, schemas

router = APIRouter(prefix="/cities", tags=["Cities"])

_WIKI_CACHE = {}


def fetch_wiki_city_info(city_name: str, country_name: str = "", state_name: str = ""):
    cache_key = f"{city_name.lower()}:{state_name.lower()}:{country_name.lower()}"
    if cache_key in _WIKI_CACHE:
        return _WIKI_CACHE[cache_key]

    candidates = [
        f"{city_name}, {state_name}" if state_name else "",
        city_name,
        f"{city_name}, {country_name}" if country_name else "",
        f"{city_name} City",
    ]
    candidates = [c for c in candidates if c]

    result = {"image_url": None, "description": None}

    for term in candidates:
        try:
            encoded = urllib.parse.quote(term.replace(" ", "_"))
            url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{encoded}"
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "GlobeTrotterApp/1.0 (travel@globetrotter.app)"},
            )
            with urllib.request.urlopen(req, timeout=3) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                extract = data.get("extract")
                if data.get("type") == "disambiguation" or (
                    extract and "may refer to:" in extract
                ):
                    continue

                img = None
                if data.get("originalimage") and data["originalimage"].get("source"):
                    img = data["originalimage"]["source"]
                elif data.get("thumbnail") and data["thumbnail"].get("source"):
                    img = data["thumbnail"]["source"]

                result["image_url"] = img
                result["description"] = extract
                break
        except Exception:
            continue

    if not result["image_url"]:
        result["image_url"] = (
            "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80"
        )

    if not result["description"]:
        result["description"] = (
            f"{city_name} is a captivating destination in {country_name or 'the region'}, "
            f"offering vibrant culture, scenic landmarks, and diverse travel experiences."
        )

    _WIKI_CACHE[cache_key] = result
    return result


@router.get("/search", response_model=List[schemas.GeoCityOut])
def search_geo_cities(
    query: str = Query(..., min_length=1),
    limit: int = Query(15, ge=1, le=50),
    db: Session = Depends(get_geo_db),
):
    """
    Search cities from countries_states_cities database with state, country, emoji and coordinates.
    Supports city names, country names (e.g. Switzerland), state names (e.g. Himachal), and combined queries (e.g. Manali, HP).
    """
    q_trimmed = query.strip()
    if not q_trimmed:
        return []

    parts = [p.strip() for p in q_trimmed.replace(",", " ").split() if p.strip()]

    if len(parts) >= 2:
        c_part = parts[0]
        sc_part = "%".join(parts[1:])
        sql_multi = text("""
            SELECT c.id, c.name, s.name AS state, co.name AS country, co.iso2 AS country_code, co.emoji,
                   CAST(c.latitude AS float) AS latitude, CAST(c.longitude AS float) AS longitude,
                   c.population, c.timezone
            FROM cities c
            LEFT JOIN states s ON c.state_id = s.id
            LEFT JOIN countries co ON c.country_id = co.id
            WHERE c.name ILIKE :c_prefix 
              AND (s.name ILIKE :sc_match OR co.name ILIKE :sc_match OR s.iso2 ILIKE :sc_exact OR co.iso2 ILIKE :sc_exact)
            ORDER BY c.population DESC NULLS LAST
            LIMIT :limit;
        """)
        multi_rows = db.execute(
            sql_multi,
            {
                "c_prefix": f"{c_part}%",
                "sc_match": f"%{sc_part}%",
                "sc_exact": sc_part,
                "limit": limit,
            },
        ).fetchall()
        if multi_rows:
            return [
                schemas.GeoCityOut(
                    id=r.id,
                    name=r.name,
                    state=r.state,
                    country=r.country or "",
                    country_code=r.country_code,
                    emoji=r.emoji,
                    latitude=r.latitude,
                    longitude=r.longitude,
                    population=r.population,
                    timezone=r.timezone,
                )
                for r in multi_rows
            ]

    sql_search = text("""
        SELECT c.id, c.name, s.name AS state, co.name AS country, co.iso2 AS country_code, co.emoji,
               CAST(c.latitude AS float) AS latitude, CAST(c.longitude AS float) AS longitude,
               c.population, c.timezone,
               CASE 
                   WHEN c.name ILIKE :exact THEN 1
                   WHEN c.name ILIKE :prefix THEN 2
                   WHEN c.name ILIKE :substr THEN 3
                   WHEN co.name ILIKE :prefix THEN 4
                   WHEN s.name ILIKE :prefix THEN 5
                   WHEN co.name ILIKE :substr THEN 6
                   ELSE 7
               END AS match_rank
        FROM cities c
        LEFT JOIN states s ON c.state_id = s.id
        LEFT JOIN countries co ON c.country_id = co.id
        WHERE c.name ILIKE :prefix 
           OR c.name ILIKE :substr
           OR co.name ILIKE :prefix
           OR co.name ILIKE :substr
           OR s.name ILIKE :prefix
        ORDER BY match_rank ASC, c.population DESC NULLS LAST
        LIMIT :limit;
    """)

    results = db.execute(
        sql_search,
        {
            "exact": q_trimmed,
            "prefix": f"{q_trimmed}%",
            "substr": f"%{q_trimmed}%",
            "limit": limit,
        },
    ).fetchall()

    return [
        schemas.GeoCityOut(
            id=r.id,
            name=r.name,
            state=r.state,
            country=r.country or "",
            country_code=r.country_code,
            emoji=r.emoji,
            latitude=r.latitude,
            longitude=r.longitude,
            population=r.population,
            timezone=r.timezone,
        )
        for r in results
    ]


@router.get("/details", response_model=schemas.CityDetailOut)
def get_city_details(
    name: Optional[str] = Query(None),
    city_id: Optional[int] = Query(None),
    country: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    db: Session = Depends(get_geo_db),
):
    """
    Get full city details including image, description, coordinates and statistics.
    """
    where_conditions = []
    params = {}

    if city_id:
        where_conditions.append("c.id = :city_id")
        params["city_id"] = city_id
    elif name:
        where_conditions.append("c.name ILIKE :name")
        params["name"] = name
        if state:
            where_conditions.append("(s.name ILIKE :state OR s.iso2 ILIKE :state)")
            params["state"] = f"%{state.strip()}%"
        if country:
            where_conditions.append("(co.name ILIKE :country OR co.iso2 ILIKE :country)")
            params["country"] = f"%{country.strip()}%"
    else:
        where_conditions.append("1=1")

    where_clause = "WHERE " + " AND ".join(where_conditions)

    sql = text(f"""
        SELECT c.id, c.name, s.name AS state, co.name AS country, co.iso2 AS country_code, co.emoji,
               CAST(c.latitude AS float) AS latitude, CAST(c.longitude AS float) AS longitude,
               c.population, c.timezone
        FROM cities c
        LEFT JOIN states s ON c.state_id = s.id
        LEFT JOIN countries co ON c.country_id = co.id
        {where_clause}
        ORDER BY c.population DESC NULLS LAST
        LIMIT 1;
    """)

    row = db.execute(sql, params).fetchone()

    resolved_name = row.name if row else (name or "City")
    resolved_state = (row.state if row else state) or ""
    resolved_country = (row.country if row else country) or ""
    resolved_code = row.country_code if row else None
    resolved_emoji = row.emoji if row else None
    resolved_lat = row.latitude if row else None
    resolved_lon = row.longitude if row else None
    resolved_pop = row.population if row else None
    resolved_tz = row.timezone if row else None
    resolved_id = row.id if row else city_id

    wiki_info = fetch_wiki_city_info(resolved_name, resolved_country, resolved_state)

    pop = resolved_pop or 50000
    if pop > 5000000:
        popularity = 10
        cost_index = 8
    elif pop > 1000000:
        popularity = 8
        cost_index = 7
    elif pop > 200000:
        popularity = 6
        cost_index = 5
    else:
        popularity = 5
        cost_index = 4

    return schemas.CityDetailOut(
        id=resolved_id,
        name=resolved_name,
        state=resolved_state,
        country=resolved_country,
        country_code=resolved_code,
        emoji=resolved_emoji,
        latitude=resolved_lat,
        longitude=resolved_lon,
        population=resolved_pop,
        timezone=resolved_tz,
        cost_index=cost_index,
        popularity=popularity,
        image_url=wiki_info["image_url"],
        description=wiki_info["description"],
    )


@router.get("", response_model=List[schemas.CityOut])
def search_cities(
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    geo_db: Session = Depends(get_geo_db),
):
    query = db.query(models.City)
    if search:
        query = query.filter(models.City.name.ilike(f"%{search}%"))
    results = query.all()
    if not results and search:
        sql = text("""
            SELECT c.id, c.name, co.name AS country, c.population
            FROM cities c
            LEFT JOIN countries co ON c.country_id = co.id
            WHERE c.name ILIKE :q
            ORDER BY c.population DESC NULLS LAST
            LIMIT 10;
        """)
        geo_rows = geo_db.execute(sql, {"q": f"{search}%"}).fetchall()
        return [
            schemas.CityOut(
                id=r.id,
                name=r.name,
                country=r.country or "",
                cost_index=5,
                popularity=7,
            )
            for r in geo_rows
        ]
    return results