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

export default function ResilienceMap({ pins }: { pins: Pin[] }) {
  return (
    <MapContainer center={[42.73, -84.55]} zoom={11} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pins.map((pin) => {
        const url = recordUrl(pin);
        return (
          <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={coloredIcon(pin.type)}>
            <Popup>
              <div style={{ color: "#1a1a1a", minWidth: "140px" }}>
                <strong style={{ color: "#1a1a1a", display: "block", marginBottom: "2px" }}>{pin.label}</strong>
                {pin.sublabel && <span style={{ color: "#444", fontSize: "0.85em", display: "block", marginBottom: "3px" }}>{pin.sublabel}</span>}
                <span style={{ color: COLORS[pin.type], textTransform: "capitalize", fontSize: "0.8em" }}>{TYPE_LABELS[pin.type] ?? pin.type}</span>
                {url && (
                  <a href={url} style={{ display: "block", marginTop: "6px", fontSize: "0.8em", color: "#2563eb", textDecoration: "underline" }}>
                    Open record →
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
