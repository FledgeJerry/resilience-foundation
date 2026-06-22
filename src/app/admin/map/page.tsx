"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const ResilienceMap = dynamic(() => import("@/components/ResilienceMap"), { ssr: false });

type Pin = { id: string; type: string; label: string; sublabel?: string; lat: number; lng: number };

const LEGEND = [
  { type: "entrepreneur", color: "#5C3D9E", label: "Entrepreneurs" },
  { type: "business", color: "#F26522", label: "Businesses" },
  { type: "house", color: "#2e7d32", label: "Housing Projects" },
  { type: "coop", color: "#1565c0", label: "Co-ops" },
];

export default function AdminMapPage() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [ungeocoded, setUngeocoded] = useState(0);
  const [untried, setUntried] = useState(0);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState("");

  function loadPins() {
    setLoading(true);
    fetch("/api/admin/map")
      .then((r) => r.json())
      .then(({ pins, ungeocodedCount, untriedCount }) => {
        setPins(pins);
        const c: Record<string, number> = {};
        for (const p of pins) c[p.type] = (c[p.type] ?? 0) + 1;
        setCounts(c);
        setUngeocoded(ungeocodedCount ?? 0);
        setUntried(untriedCount ?? 0);
        setLoading(false);
      });
  }

  useEffect(() => { loadPins(); }, []);

  async function runGeocoding() {
    setGeocoding(true);
    const res = await fetch("/api/admin/map", { method: "POST" });
    const data = await res.json();
    const failed = data.attempted - data.geocoded;
    setGeocoding(false);
    setGeocodeStatus(
      failed > 0
        ? `Done — geocoded ${data.geocoded}, ${failed} couldn't be matched (check their addresses)`
        : `Done — geocoded ${data.geocoded}`
    );
    loadPins();
  }

  return (
    <div style={{ padding: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <h1>Community Map</h1>
        {untried > 0 && !geocoding && (
          <button className="btn btn--secondary" style={{ fontSize: "0.8rem" }} onClick={runGeocoding}>
            Geocode {untried} new addresses
          </button>
        )}
        {geocoding && <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>Geocoding…</span>}
        {!geocoding && geocodeStatus && <span style={{ fontSize: "0.85rem", color: "var(--color-teal-accent)" }}>{geocodeStatus}</span>}
        {ungeocoded - untried > 0 && <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>({ungeocoded - untried} unmatched address{ungeocoded - untried === 1 ? "" : "es"})</span>}
      </div>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {LEGEND.map(({ type, color, label }) => (
          <div key={type} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: color, border: "2px solid white", boxShadow: "0 1px 3px rgba(0,0,0,.3)" }} />
            <span>{label} {counts[type] ? `(${counts[type]})` : ""}</span>
          </div>
        ))}
      </div>

      <div style={{ height: "70vh", borderRadius: "8px", overflow: "hidden", border: "1px solid #ddd" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#666" }}>
            Loading map…
          </div>
        ) : pins.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#666", gap: "0.75rem" }}>
            <p>No geocoded addresses yet.</p>
            {ungeocoded > 0 && <button className="btn btn--primary" onClick={runGeocoding}>Geocode {ungeocoded} addresses now</button>}
          </div>
        ) : (
          <ResilienceMap pins={pins} />
        )}
      </div>
    </div>
  );
}
