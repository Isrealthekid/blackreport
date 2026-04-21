"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LMap, Layer } from "leaflet";

export type MissionMapProps = {
  startLat: number | string | null | undefined;
  startLng: number | string | null | undefined;
  endLat: number | string | null | undefined;
  endLng: number | string | null | undefined;
  /** Zone radius around start/end in metres (default 500). */
  radius?: number;
  /** Map height (e.g. "20rem"). Default 20rem. */
  height?: string;
  /** Disable pan/zoom — useful for the print view. */
  readOnly?: boolean;
};

type LatLng = { lat: number; lng: number };

function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function midpoint(a: LatLng, b: LatLng): LatLng {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const lng1 = toRad(a.lng);
  const dLng = toRad(b.lng - a.lng);
  const bx = Math.cos(lat2) * Math.cos(dLng);
  const by = Math.cos(lat2) * Math.sin(dLng);
  const lat3 = Math.atan2(
    Math.sin(lat1) + Math.sin(lat2),
    Math.sqrt((Math.cos(lat1) + bx) ** 2 + by ** 2),
  );
  const lng3 = lng1 + Math.atan2(by, Math.cos(lat1) + bx);
  return { lat: toDeg(lat3), lng: ((toDeg(lng3) + 540) % 360) - 180 };
}

function bearingDeg(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function quadraticCurve(a: LatLng, b: LatLng, curvature = 0.18): LatLng[] {
  const mid = midpoint(a, b);
  const dx = b.lng - a.lng;
  const dy = b.lat - a.lat;
  const ctrl = { lat: mid.lat + dx * curvature, lng: mid.lng - dy * curvature };
  const pts: LatLng[] = [];
  const steps = 48;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = (1 - t) ** 2 * a.lat + 2 * (1 - t) * t * ctrl.lat + t ** 2 * b.lat;
    const lng = (1 - t) ** 2 * a.lng + 2 * (1 - t) * t * ctrl.lng + t ** 2 * b.lng;
    pts.push({ lat, lng });
  }
  return pts;
}

function formatMeters(m: number): string {
  if (m < 1000) return `${m.toFixed(0)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

export default function MissionMap({
  startLat,
  startLng,
  endLat,
  endLng,
  radius = 500,
  height = "20rem",
  readOnly = false,
}: MissionMapProps) {
  const sLat = Number(startLat);
  const sLng = Number(startLng);
  const eLat = Number(endLat);
  const eLng = Number(endLng);
  const valid =
    [sLat, sLng, eLat, eLng].every((v) => Number.isFinite(v)) &&
    !(sLat === 0 && sLng === 0 && eLat === 0 && eLng === 0);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const layersRef = useRef<Layer[]>([]);
  const [status, setStatus] = useState<{ distance: number; inside: boolean } | null>(null);

  useEffect(() => {
    if (!valid || !containerRef.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      const start: LatLng = { lat: sLat, lng: sLng };
      const end: LatLng = { lat: eLat, lng: eLng };
      const center = midpoint(start, end);
      const distance = haversineMeters(start, end);
      const enclosingRadius = distance / 2 + radius;

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, {
          scrollWheelZoom: !readOnly,
          dragging: !readOnly,
          zoomControl: !readOnly,
          doubleClickZoom: !readOnly,
          touchZoom: !readOnly,
          keyboard: !readOnly,
        });
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(mapRef.current);
      }

      const map = mapRef.current;

      for (const ly of layersRef.current) ly.remove();
      layersRef.current = [];

      const startCircle = L.circle([start.lat, start.lng], {
        radius,
        color: "#22c55e",
        weight: 2,
        dashArray: "6 6",
        fillColor: "#22c55e",
        fillOpacity: 0.08,
      }).addTo(map);

      const endCircle = L.circle([end.lat, end.lng], {
        radius,
        color: "#ef4444",
        weight: 2,
        dashArray: "6 6",
        fillColor: "#ef4444",
        fillOpacity: 0.08,
      }).addTo(map);

      const enclosing = L.circle([center.lat, center.lng], {
        radius: enclosingRadius,
        color: "#a855f7",
        weight: 2,
        dashArray: "10 6",
        fillColor: "#a855f7",
        fillOpacity: 0.04,
      }).addTo(map);

      const curve = quadraticCurve(start, end);
      const curveLL = curve.map((p) => [p.lat, p.lng] as [number, number]);
      const path = L.polyline(curveLL, {
        color: "#3b82f6",
        weight: 3,
        opacity: 0.9,
      }).addTo(map);

      const last = curve[curve.length - 1];
      const prev = curve[curve.length - 2];
      const tangent = bearingDeg(prev, last);
      const arrowIcon = L.divIcon({
        className: "mission-map-arrow",
        html: `<svg width="22" height="22" viewBox="0 0 22 22" style="transform: rotate(${tangent}deg); transform-origin: center;"><path d="M11 2 L18 18 L11 14 L4 18 Z" fill="#3b82f6" stroke="#1e3a8a" stroke-width="1" stroke-linejoin="round"/></svg>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      const arrow = L.marker([last.lat, last.lng], { icon: arrowIcon, interactive: false }).addTo(map);

      const startIcon = L.divIcon({
        className: "mission-map-pin",
        html: `<div style="background:#22c55e;color:#052e16;border:2px solid #064e3b;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;box-shadow:0 1px 4px rgba(0,0,0,0.35);">S</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      const endIcon = L.divIcon({
        className: "mission-map-pin",
        html: `<div style="background:#ef4444;color:#450a0a;border:2px solid #7f1d1d;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;box-shadow:0 1px 4px rgba(0,0,0,0.35);">E</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      const startMarker = L.marker([start.lat, start.lng], { icon: startIcon }).addTo(map);
      const endMarker = L.marker([end.lat, end.lng], { icon: endIcon }).addTo(map);

      layersRef.current = [
        startCircle,
        endCircle,
        enclosing,
        path,
        arrow,
        startMarker,
        endMarker,
      ];

      // Compute bounds manually from center + enclosingRadius so we don't depend
      // on Circle.getBounds() (which reads circle._map — can be undefined during
      // rapid re-renders or React strict-mode double invocation).
      const metersPerDegLat = 111320;
      const latDelta = enclosingRadius / metersPerDegLat;
      const lngDelta =
        enclosingRadius / (metersPerDegLat * Math.cos((center.lat * Math.PI) / 180));
      const bounds = L.latLngBounds(
        [center.lat - latDelta, center.lng - lngDelta],
        [center.lat + latDelta, center.lng + lngDelta],
      );
      map.invalidateSize(false);
      map.fitBounds(bounds, { padding: [24, 24] });

      const inside = curve.every(
        (p) => haversineMeters(p, center) <= enclosingRadius + 0.5,
      );
      setStatus({ distance, inside });
    })();

    return () => {
      cancelled = true;
    };
  }, [sLat, sLng, eLat, eLng, radius, valid, readOnly]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layersRef.current = [];
      }
    };
  }, []);

  if (!valid) {
    return (
      <div className="mt-3 p-4 border border-neutral-800 bg-neutral-950 rounded text-xs text-neutral-500">
        Enter valid take-off and landing coordinates to preview the flight map.
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div
        ref={containerRef}
        style={{ height }}
        className="w-full rounded border border-neutral-800 overflow-hidden"
      />
      <div className="mt-2 text-xs flex items-center justify-between flex-wrap gap-2 bg-neutral-950 border border-neutral-800 rounded px-3 py-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-neutral-400">
            <span
              aria-hidden
              className="inline-block w-3 h-3 rounded-full border-2 border-green-500"
              style={{ borderStyle: "dashed" }}
            />
            Take-off ({radius} m)
          </span>
          <span className="flex items-center gap-1 text-neutral-400">
            <span
              aria-hidden
              className="inline-block w-3 h-3 rounded-full border-2 border-red-500"
              style={{ borderStyle: "dashed" }}
            />
            Landing ({radius} m)
          </span>
          <span className="flex items-center gap-1 text-neutral-400">
            <span
              aria-hidden
              className="inline-block w-3 h-3 rounded-full border-2 border-purple-500"
              style={{ borderStyle: "dashed" }}
            />
            Journey boundary
          </span>
        </div>
        {status && (
          <div className="flex items-center gap-3">
            <span className="text-neutral-300">
              Distance: <span className="font-mono">{formatMeters(status.distance)}</span>
            </span>
            <span className={status.inside ? "text-green-400" : "text-red-400"}>
              {status.inside ? "✓ Route within boundary" : "⚠ Route exits boundary"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
