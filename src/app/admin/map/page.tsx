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

  useEffect(() => {
    fetch("/api/admin/map")
      .then((r) => r.json())
      .then(({ pins }) => {
        setPins(pins);
        const c: Record<string, number> = {};
        for (const p of pins) c[p.type] = (c[p.type] ?? 0) + 1;
        setCounts(c);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ padding: "1.5rem" }}>
      <h1 style={{ marginBottom: "0.5rem" }}>Community Map</h1>
      <p style={{ color: "#666", marginBottom: "1rem", fontSize: "0.9rem" }}>
        Admin only — entrepreneurs, businesses, co-ops, and housing projects.
        {loading && " Geocoding new addresses…"}
      </p>

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
        ) : (
          <ResilienceMap pins={pins} />
        )}
      </div>
    </div>
  );
}
