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

export default function ResilienceMap({ pins }: { pins: Pin[] }) {
  return (
    <MapContainer center={[42.73, -84.55]} zoom={11} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pins.map((pin) => (
        <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={coloredIcon(pin.type)}>
          <Popup>
            <strong>{pin.label}</strong>
            {pin.sublabel && <><br />{pin.sublabel}</>}
            <br />
            <span style={{ color: COLORS[pin.type], textTransform: "capitalize", fontSize: "0.8em" }}>{pin.type}</span>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
