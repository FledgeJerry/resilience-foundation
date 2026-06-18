"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons broken by webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const COLORS: Record<string, string> = {
  entrepreneur: "#5C3D9E",
  business: "#F26522",
  house: "#2e7d32",
  coop: "#1565c0",
};

const TYPE_LABELS: Record<string, string> = {
  entrepreneur: "Entrepreneur",
  business: "Business",
  house: "Housing Project",
  coop: "Co-op",
};

function coloredIcon(type: string) {
  const color = COLORS[type] ?? "#666";
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

type Pin = { id: string; type: string; label: string; sublabel?: string; lat: number; lng: number };

function recordUrl(pin: Pin): string | null {
  if (pin.type === "business") return `/admin/cohort?open=${pin.id}`;
  if (pin.type === "house") return `/housing/project/${pin.id}`;
  return null;
}

function groupByLocation(pins: Pin[]): Map<string, Pin[]> {
  const groups = new Map<string, Pin[]>();
  for (const pin of pins) {
    const key = `${pin.lat.toFixed(5)},${pin.lng.toFixed(5)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(pin);
  }
  return groups;
}

function stackedIcon(count: number, type: string) {
  const color = COLORS[type] ?? "#666";
  if (count === 1) return coloredIcon(type);
  return L.divIcon({
    className: "",
    html: `<div style="width:22px;height:22px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700;line-height:1">${count}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

export default function ResilienceMap({ pins }: { pins: Pin[] }) {
  const groups = groupByLocation(pins);

  return (
    <MapContainer center={[42.73, -84.55]} zoom={11} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {[...groups.entries()].map(([key, group]) => {
        const first = group[0];
        // Use the most "important" type for the icon color (business > coop > entrepreneur > house)
        const priority = ["business", "coop", "entrepreneur", "house"];
        const iconType = priority.find((t) => group.some((p) => p.type === t)) ?? first.type;

        return (
          <Marker key={key} position={[first.lat, first.lng]} icon={stackedIcon(group.length, iconType)}>
            <Popup>
              <div style={{ color: "#1a1a1a", minWidth: "160px", maxWidth: "240px" }}>
                {group.length > 1 && (
                  <div style={{ fontSize: "0.75em", fontWeight: 700, color: "#666", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {group.length} at this address
                  </div>
                )}
                {group.map((pin) => {
                  const url = recordUrl(pin);
                  return (
                    <div key={pin.id} style={{ marginBottom: group.length > 1 ? "8px" : "0", paddingBottom: group.length > 1 ? "8px" : "0", borderBottom: group.length > 1 ? "1px solid #eee" : "none" }}>
                      <strong style={{ color: "#1a1a1a", display: "block", marginBottom: "2px" }}>{pin.label}</strong>
                      {pin.sublabel && <span style={{ color: "#444", fontSize: "0.85em", display: "block", marginBottom: "2px" }}>{pin.sublabel}</span>}
                      <span style={{ color: COLORS[pin.type], textTransform: "capitalize", fontSize: "0.8em" }}>{TYPE_LABELS[pin.type] ?? pin.type}</span>
                      {url && (
                        <a href={url} style={{ display: "block", marginTop: "4px", fontSize: "0.8em", color: "#2563eb", textDecoration: "underline" }}>
                          Open record →
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
