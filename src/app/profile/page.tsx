"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Profile = {
  name: string; email: string; city: string; state: string;
  ageRange: string; gender: string; raceEthnicity: string;
  hasIdea: string; foundingGroup: string; biggestBarrier: string;
  readinessStage: string; workedAtCoop: string; wouldConvert: string;
  emailSubscribed: boolean;
};

const EMPTY: Profile = {
  name: "", email: "", city: "", state: "", ageRange: "", gender: "",
  raceEthnicity: "", hasIdea: "", foundingGroup: "", biggestBarrier: "",
  readinessStage: "", workedAtCoop: "", wouldConvert: "", emailSubscribed: false,
};

function Select({ id, value, onChange, children }: {
  id: string; value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select…</option>
      {children}
    </select>
  );
}

export default function ProfilePage() {
  const { status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status !== "authenticated") return;
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d) setProfile({
          ...EMPTY,
          ...Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v ?? ""])),
          emailSubscribed: d.emailSubscribed ?? false,
        });
        setLoading(false);
      });
  }, [status, router]);

  function set(field: keyof Profile, value: string | boolean) {
    setProfile((p) => ({ ...p, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (status === "loading" || loading) return <p className="text-muted">Loading…</p>;

  return (
    <div style={{ maxWidth: "600px" }}>
      <span className="eyebrow">Your Account</span>
      <h1 style={{ marginBottom: "0.25rem" }}>Profile</h1>
      <p style={{ marginBottom: "2rem" }}>Tell us about yourself. This helps us improve the platform and connect you with others building co-ops.</p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

        {/* Basic info */}
        <div className="card">
          <p style={{ fontWeight: 600, color: "var(--color-limestone)", marginBottom: "1rem" }}>Basic Info</p>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input id="name" type="text" value={profile.name} onChange={(e) => set("name", e.target.value)} placeholder="Your name" />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={profile.email} disabled style={{ opacity: 0.6 }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="city">City</label>
              <input id="city" type="text" value={profile.city} onChange={(e) => set("city", e.target.value)} placeholder="Lansing" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="state">State</label>
              <input id="state" type="text" value={profile.state} onChange={(e) => set("state", e.target.value)} placeholder="MI" maxLength={2} />
            </div>
          </div>
        </div>

        {/* Demographics */}
        <div className="card">
          <p style={{ fontWeight: 600, color: "var(--color-limestone)", marginBottom: "0.25rem" }}>Demographics</p>
          <p style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>Optional — helps us understand who we&apos;re serving.</p>
          <div className="form-group">
            <label htmlFor="ageRange">Age range</label>
            <Select id="ageRange" value={profile.ageRange} onChange={(v) => set("ageRange", v)}>
              <option value="18-24">18–24</option>
              <option value="25-34">25–34</option>
              <option value="35-44">35–44</option>
              <option value="45-54">45–54</option>
              <option value="55-64">55–64</option>
              <option value="65+">65+</option>
            </Select>
          </div>
          <div className="form-group">
            <label htmlFor="gender">Gender</label>
            <Select id="gender" value={profile.gender} onChange={(v) => set("gender", v)}>
              <option value="woman">Woman</option>
              <option value="man">Man</option>
              <option value="nonbinary">Non-binary</option>
              <option value="self-describe">Prefer to self-describe</option>
              <option value="prefer-not">Prefer not to say</option>
            </Select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="raceEthnicity">Race / ethnicity</label>
            <Select id="raceEthnicity" value={profile.raceEthnicity} onChange={(v) => set("raceEthnicity", v)}>
              <option value="black">Black or African American</option>
              <option value="hispanic">Hispanic or Latino</option>
              <option value="white">White</option>
              <option value="asian">Asian</option>
              <option value="indigenous">American Indian or Alaska Native</option>
              <option value="pacific-islander">Native Hawaiian or Pacific Islander</option>
              <option value="multiracial">Multiracial</option>
              <option value="self-describe">Prefer to self-describe</option>
              <option value="prefer-not">Prefer not to say</option>
            </Select>
          </div>
        </div>

        {/* Entrepreneurial readiness */}
        <div className="card">
          <p style={{ fontWeight: 600, color: "var(--color-limestone)", marginBottom: "0.25rem" }}>Entrepreneurial Readiness</p>
          <p style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>Where are you in the journey?</p>

          <div className="form-group">
            <label htmlFor="readinessStage">How far along are you?</label>
            <Select id="readinessStage" value={profile.readinessStage} onChange={(v) => set("readinessStage", v)}>
              <option value="curious">Just curious — learning about co-ops</option>
              <option value="researching">Researching — have an idea, doing homework</option>
              <option value="planning">Actively planning — working with a group</option>
              <option value="launching">Ready to launch — let&apos;s go</option>
            </Select>
          </div>

          <div className="form-group">
            <label htmlFor="hasIdea">Do you have a business idea?</label>
            <Select id="hasIdea" value={profile.hasIdea} onChange={(v) => set("hasIdea", v)}>
              <option value="yes">Yes — I know what I want to build</option>
              <option value="exploring">Exploring — a few directions I&apos;m considering</option>
              <option value="no">Not yet — still figuring it out</option>
            </Select>
          </div>

          <div className="form-group">
            <label htmlFor="foundingGroup">Do you have a founding group?</label>
            <Select id="foundingGroup" value={profile.foundingGroup} onChange={(v) => set("foundingGroup", v)}>
              <option value="yes">Yes — I have people ready to build with me</option>
              <option value="forming">Forming — talking to potential co-founders</option>
              <option value="solo">Solo right now — looking for partners</option>
            </Select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="biggestBarrier">What&apos;s your biggest barrier?</label>
            <Select id="biggestBarrier" value={profile.biggestBarrier} onChange={(v) => set("biggestBarrier", v)}>
              <option value="capital">Capital — we need funding</option>
              <option value="knowledge">Knowledge — not sure how to do this</option>
              <option value="network">Network — need the right people</option>
              <option value="time">Time — too much going on right now</option>
              <option value="fear">Fear — it feels risky</option>
              <option value="none">No major barrier — ready to move</option>
            </Select>
          </div>
        </div>

        {/* Co-op background */}
        <div className="card">
          <p style={{ fontWeight: 600, color: "var(--color-limestone)", marginBottom: "1rem" }}>Co-op Background</p>
          <div className="form-group">
            <label htmlFor="workedAtCoop">Have you ever worked at a co-op?</label>
            <Select id="workedAtCoop" value={profile.workedAtCoop} onChange={(v) => set("workedAtCoop", v)}>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </Select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="wouldConvert">Are you at a job you&apos;d want to convert to a co-op?</label>
            <Select id="wouldConvert" value={profile.wouldConvert} onChange={(v) => set("wouldConvert", v)}>
              <option value="yes">Yes</option>
              <option value="maybe">Maybe</option>
              <option value="no">No</option>
            </Select>
          </div>
        </div>

        {/* Email */}
        <div className="card">
          <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", margin: 0 }}>
            <input
              type="checkbox"
              checked={profile.emailSubscribed}
              onChange={(e) => set("emailSubscribed", e.target.checked)}
              style={{ width: "auto", accentColor: "var(--color-dome-gold)" }}
            />
            <span style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)" }}>
              Send me updates about resilience.foundation and co-op resources
            </span>
          </label>
        </div>

        {saved && <div className="alert alert--success">Profile saved.</div>}

        <button type="submit" disabled={saving} className="btn btn--primary" style={{ alignSelf: "flex-start" }}>
          {saving ? "Saving…" : "Save profile"}
        </button>

      </form>
    </div>
  );
}
