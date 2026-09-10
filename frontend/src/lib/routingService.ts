/**
 * Road Routing Service using OSRM (Open Source Routing Machine)
 * Fetches real driving highway routes connecting any number of stops,
 * returning full road coordinates for Google Maps-style navigation paths.
 */

export interface RouteLeg {
  fromIndex: number;
  toIndex: number;
  distanceKm: number;
  distanceMiles: number;
  drivingHours: number;
  flightHours: number;
  summary: string;
}

export interface RouteResult {
  coordinates: [number, number][]; // [lat, lng][]
  distanceKm: number;
  durationHours: number;
  isDrivingRoute: boolean;
  legs: RouteLeg[];
  totalFlightHours: number;
}

// Great-circle Haversine distance
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Generate smooth geodesic curve points between two coordinates (for flight / cross-water fallback)
function generateGeodesicSegment(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  numSteps = 20
): [number, number][] {
  const coords: [number, number][] = [];
  for (let i = 0; i <= numSteps; i++) {
    const f = i / numSteps;
    const lat = lat1 + (lat2 - lat1) * f;
    const lng = lng1 + (lng2 - lng1) * f;
    coords.push([lat, lng]);
  }
  return coords;
}

// In-memory cache to prevent redundant network calls
const routeCache = new Map<string, RouteResult>();

/**
 * Fetch real driving road route connecting all coordinates in sequence.
 * @param points Array of [lat, lng] coordinates in order
 */
export async function getDrivingRoute(points: [number, number][]): Promise<RouteResult> {
  if (!points || points.length === 0) {
    return { coordinates: [], distanceKm: 0, durationHours: 0, isDrivingRoute: false, legs: [], totalFlightHours: 0 };
  }

  if (points.length === 1) {
    const single = points[0]!;
    return {
      coordinates: [[single[0], single[1]]],
      distanceKm: 0,
      durationHours: 0,
      isDrivingRoute: false,
      legs: [],
      totalFlightHours: 0,
    };
  }

  // Cache key based on rounded coordinates
  const cacheKey = points.map((p) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`).join(";");
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  // Build OSRM URL: lng,lat;lng,lat;...
  const coordString = points.map((p) => `${p[1]},${p[0]}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.code === "Ok" && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        // GeoJSON coordinates are [lng, lat] -> convert to Leaflet [lat, lng]
        const roadCoords: [number, number][] = route.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]]
        );
        const distanceKm = Math.round(route.distance / 1000);
        const durationHours = parseFloat((route.duration / 3600).toFixed(1));

        // Compute per-leg breakdown (Start -> Stop 1, Stop 1 -> Stop 2, etc.)
        const legs: RouteLeg[] = (route.legs || []).map((leg: any, idx: number) => {
          const legDistKm = Math.round(leg.distance / 1000);
          const legDriveHours = parseFloat((leg.duration / 3600).toFixed(1));
          const p1 = points[idx]!;
          const p2 = points[idx + 1]!;
          const directKm = haversineDistance(p1[0], p1[1], p2[0], p2[1]);
          const legFlightHours = parseFloat((directKm / 800).toFixed(1));

          return {
            fromIndex: idx,
            toIndex: idx + 1,
            distanceKm: legDistKm,
            distanceMiles: Math.round(legDistKm * 0.621371),
            drivingHours: legDriveHours,
            flightHours: legFlightHours,
            summary: leg.summary || `Highway Segment ${idx + 1}`,
          };
        });

        // Compute total flight hours based on sequential great-circle legs
        let directTotalKm = 0;
        for (let i = 0; i < points.length - 1; i++) {
          directTotalKm += haversineDistance(
            points[i]![0],
            points[i]![1],
            points[i + 1]![0],
            points[i + 1]![1]
          );
        }
        const totalFlightHours = parseFloat((directTotalKm / 800).toFixed(1));

        const result: RouteResult = {
          coordinates: roadCoords,
          distanceKm,
          durationHours,
          isDrivingRoute: true,
          legs,
          totalFlightHours,
        };
        routeCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    console.warn("OSRM driving route request failed or timed out, using fallback:", err);
  }

  // Fallback: Great circle interpolation connecting the waypoints
  const fallbackCoords: [number, number][] = [];
  const fallbackLegs: RouteLeg[] = [];
  let totalKm = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const legDirectKm = haversineDistance(p1[0], p1[1], p2[0], p2[1]);
    totalKm += legDirectKm;
    const estDriveKm = Math.round(legDirectKm * 1.25);
    const estDriveHours = parseFloat((estDriveKm / 75).toFixed(1));
    const legFlightHours = parseFloat((legDirectKm / 800).toFixed(1));

    fallbackLegs.push({
      fromIndex: i,
      toIndex: i + 1,
      distanceKm: estDriveKm,
      distanceMiles: Math.round(estDriveKm * 0.621371),
      drivingHours: estDriveHours,
      flightHours: legFlightHours,
      summary: `Direct / Geodesic Route ${i + 1}`,
    });

    const seg = generateGeodesicSegment(p1[0], p1[1], p2[0], p2[1], 25);
    if (i > 0) seg.shift(); // Remove duplicate junction point
    fallbackCoords.push(...seg);
  }

  const fallbackResult: RouteResult = {
    coordinates: fallbackCoords,
    distanceKm: Math.round(totalKm),
    durationHours: parseFloat((totalKm / 80).toFixed(1)), // Estimated ~80km/h
    isDrivingRoute: false,
    legs: fallbackLegs,
    totalFlightHours: parseFloat((totalKm / 800).toFixed(1)),
  };

  routeCache.set(cacheKey, fallbackResult);
  return fallbackResult;
}
