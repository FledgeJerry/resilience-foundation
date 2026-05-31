import { MetadataRoute } from "next";

const BASE = "https://resilience.foundation";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, priority: 1.0, changeFrequency: "weekly" },
    { url: `${BASE}/co-op`, priority: 0.9, changeFrequency: "monthly" },
    { url: `${BASE}/handbook`, priority: 0.9, changeFrequency: "monthly" },
    { url: `${BASE}/journey`, priority: 0.9, changeFrequency: "monthly" },
    { url: `${BASE}/housing`, priority: 0.8, changeFrequency: "monthly" },
    { url: `${BASE}/governance`, priority: 0.8, changeFrequency: "monthly" },
    { url: `${BASE}/research`, priority: 0.7, changeFrequency: "monthly" },
    { url: `${BASE}/replicate`, priority: 0.7, changeFrequency: "monthly" },
    { url: `${BASE}/needs`, priority: 0.7, changeFrequency: "weekly" },
    { url: `${BASE}/pulse`, priority: 0.6, changeFrequency: "weekly" },
    { url: `${BASE}/directory`, priority: 0.6, changeFrequency: "weekly" },
    { url: `${BASE}/about`, priority: 0.5, changeFrequency: "monthly" },
    { url: `${BASE}/documents`, priority: 0.5, changeFrequency: "monthly" },
  ];
}
