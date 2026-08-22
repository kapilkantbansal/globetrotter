import { useMemo, useState } from "react";
import { MapPin, Minus, Plus } from "lucide-react";
import { cityCoords, continents } from "@/data/cityCoords";
import type { City } from "@/api/types";

const W = 1000;
const H = 500;

function project(lon: number, lat: number) {
  return { x: ((lon + 180) / 360) * W, y: ((90 - lat) / 180) * H };
}

interface CityMapProps {
  cities: City[];
  selectedId: number | null;
  onSelect: (city: City) => void;
  /** Cities already added to the route, drawn as a connected path. */
  routeIds?: number[];
}

export function CityMap({
  cities,
  selectedId,
  onSelect,
  routeIds = [],
}: CityMapProps) {
  const [zoom, setZoom] = useState(1);

  const pinned = cities.filter((c) => cityCoords[c.id]);
  const selected = pinned.find((c) => c.id === selectedId) ?? null;

  const focus = useMemo(() => {
    if (!selected) return { x: W / 2, y: H / 2 };
    const co = cityCoords[selected.id]!;
    return project(co.lon, co.lat);
  }, [selected]);

  // Pan so the focus point sits in the middle while zoomed.
  const tx = W / 2 - focus.x * zoom;
  const ty = H / 2 - focus.y * zoom;

  const routePoints = routeIds
    .map((id) => cityCoords[id])
    .filter(Boolean)
    .map((c) => project(c!.lon, c!.lat));

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-lift">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div>
          <h3 className="font-display text-base font-bold">Destination map</h3>
          <p className="text-xs text-muted-foreground">
            {selected
              ? `Focused on ${selected.name}, ${selected.country}`
              : "Click any pin — the map flies to that destination"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => setZoom((z) => Math.max(1, +(z - 0.75).toFixed(2)))}
            className="rounded-full border border-border p-2 transition hover:bg-secondary"
          >
            <Minus className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => setZoom((z) => Math.min(6, +(z + 0.75).toFixed(2)))}
            className="rounded-full border border-border p-2 transition hover:bg-secondary"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      <div className="relative bg-[var(--map-ocean)]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-[320px] w-full sm:h-[420px]"
          role="img"
          aria-label="World map of available destinations"
        >
          <g
            style={{
              transform: `translate(${tx}px, ${ty}px) scale(${zoom})`,
              transition: "transform 900ms cubic-bezier(0.65, 0, 0.35, 1)",
            }}
          >
            {/* graticule */}
            {Array.from({ length: 11 }, (_, i) => (
              <line
                key={`v${i}`}
                x1={(i * W) / 10}
                y1={0}
                x2={(i * W) / 10}
                y2={H}
                stroke="var(--map-grid)"
                strokeWidth={0.6}
              />
            ))}
            {Array.from({ length: 7 }, (_, i) => (
              <line
                key={`h${i}`}
                x1={0}
                y1={(i * H) / 6}
                x2={W}
                y2={(i * H) / 6}
                stroke="var(--map-grid)"
                strokeWidth={0.6}
              />
            ))}

            {continents.map((poly, i) => (
              <polygon
                key={i}
                points={poly
                  .map(([lon, lat]) => {
                    const p = project(lon, lat);
                    return `${p.x},${p.y}`;
                  })
                  .join(" ")}
                fill="var(--map-land)"
                stroke="var(--map-coast)"
                strokeWidth={1}
              />
            ))}

            {routePoints.length > 1 ? (
              <polyline
                points={routePoints.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="var(--map-route)"
                strokeWidth={2.2}
                strokeDasharray="7 6"
                strokeLinecap="round"
              />
            ) : null}

            {pinned.map((city) => {
              const co = cityCoords[city.id]!;
              const p = project(co.lon, co.lat);
              const active = city.id === selectedId;
              const r = active ? 7 / zoom : 5 / zoom;
              return (
                <g
                  key={city.id}
                  onClick={() => onSelect(city)}
                  style={{ cursor: "pointer" }}
                >
                  {active ? (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={r * 2.6}
                      fill="var(--map-pulse)"
                      className="animate-ping-slow"
                    />
                  ) : null}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={r}
                    fill={active ? "var(--map-pin-active)" : "var(--map-pin)"}
                    stroke="var(--map-pin-ring)"
                    strokeWidth={2 / zoom}
                  />
                  <title>{`${city.name}, ${city.country}`}</title>
                  {zoom > 1.5 || active ? (
                    <text
                      x={p.x + 9 / zoom}
                      y={p.y + 4 / zoom}
                      fontSize={13 / zoom}
                      fontWeight={700}
                      fill="var(--map-label)"
                    >
                      {city.name}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </g>
        </svg>

        {selected ? (
          <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-full border border-border bg-card/90 px-4 py-2 text-sm font-semibold backdrop-blur">
            <MapPin className="size-4 text-primary" />
            {selected.name}, {selected.country}
          </div>
        ) : null}
      </div>
    </div>
  );
}
