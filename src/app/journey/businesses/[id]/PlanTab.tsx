"use client";

import { useEffect, useState, useRef } from "react";
import { JOURNEY_PLAN } from "@/lib/journey-plan-content";

type Props = { businessId: string };

export default function PlanTab({ businessId }: Props) {
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(JOURNEY_PLAN[0].id);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    fetch(`/api/journey/businesses/${businessId}/plan`)
      .then((r) => r.json())
      .then((data) => { setEntries(data); setLoading(false); });
  }, [businessId]);

  function handleChange(fieldId: string, value: string) {
    setEntries((e) => ({ ...e, [fieldId]: value }));
    if (saveTimers.current[fieldId]) clearTimeout(saveTimers.current[fieldId]);
    saveTimers.current[fieldId] = setTimeout(() => saveField(fieldId, value), 800);
  }

  async function saveField(fieldId: string, value: string) {
    if (!value.trim()) return;
    setSaving((s) => ({ ...s, [fieldId]: true }));
    await fetch(`/api/journey/businesses/${businessId}/plan`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fieldId, value }),
    });
    setSaving((s) => ({ ...s, [fieldId]: false }));
    setSaved((s) => ({ ...s, [fieldId]: true }));
    setTimeout(() => setSaved((s) => ({ ...s, [fieldId]: false })), 2000);
  }

  function countFilled(sectionId: string) {
    const section = JOURNEY_PLAN.find((s) => s.id === sectionId);
    if (!section) return { filled: 0, total: 0 };
    const filled = section.fields.filter((f) => (entries[f.id] ?? "").trim().length > 0).length;
    return { filled, total: section.fields.length };
  }

  const totalFilled = JOURNEY_PLAN.flatMap((s) => s.fields).filter((f) => (entries[f.id] ?? "").trim().length > 0).length;
  const totalFields = JOURNEY_PLAN.flatMap((s) => s.fields).length;

  if (loading) return <div className="tab-panel"><p className="loading-text">Loading plan…</p></div>;

  const currentSection = JOURNEY_PLAN.find((s) => s.id === activeSection)!;

  return (
    <div className="tab-panel plan-tab">
      <div className="plan-tab__header">
        <div>
          <h2>Business Plan</h2>
          <p className="plan-tab__progress-text">{totalFilled} of {totalFields} fields completed</p>
        </div>
        <div className="plan-tab__progress-bar-wrap">
          <div className="plan-tab__progress-bar" style={{ width: `${Math.round((totalFilled / totalFields) * 100)}%` }} />
        </div>
      </div>

      <div className="plan-tab__layout">
        {/* Section nav */}
        <nav className="plan-nav">
          {JOURNEY_PLAN.map((section) => {
            const { filled, total } = countFilled(section.id);
            const complete = filled === total;
            return (
              <button
                key={section.id}
                className={`plan-nav__item${activeSection === section.id ? " active" : ""}${complete ? " complete" : ""}`}
                onClick={() => setActiveSection(section.id)}
              >
                <span className="plan-nav__label">{section.title}</span>
                <span className="plan-nav__count">{filled}/{total}</span>
              </button>
            );
          })}
        </nav>

        {/* Section content */}
        <div className="plan-section">
          <div className="plan-section__header">
            <h3>{currentSection.title}</h3>
            <p className="plan-section__description">{currentSection.description}</p>
          </div>

          <div className="plan-section__fields">
            {currentSection.fields.map((field) => {
              const value = entries[field.id] ?? "";
              const isSaving = saving[field.id];
              const isSaved = saved[field.id];
              return (
                <div key={field.id} className="plan-field">
                  <label className="plan-field__label">
                    {field.label}
                    {isSaving && <span className="plan-field__status saving">saving…</span>}
                    {isSaved && !isSaving && <span className="plan-field__status saved">saved ✓</span>}
                  </label>
                  {field.hint && <p className="plan-field__hint">{field.hint}</p>}
                  {field.type === "textarea" ? (
                    <textarea
                      value={value}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      placeholder={field.placeholder}
                      rows={3}
                      className="plan-field__input"
                    />
                  ) : field.type === "number" ? (
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      placeholder={field.placeholder}
                      className="plan-field__input"
                      min={0}
                    />
                  ) : (
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      placeholder={field.placeholder}
                      className="plan-field__input"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Section nav buttons */}
          <div className="plan-section__nav">
            {JOURNEY_PLAN.findIndex((s) => s.id === activeSection) > 0 && (
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  const idx = JOURNEY_PLAN.findIndex((s) => s.id === activeSection);
                  setActiveSection(JOURNEY_PLAN[idx - 1].id);
                }}
              >
                ← Previous
              </button>
            )}
            {JOURNEY_PLAN.findIndex((s) => s.id === activeSection) < JOURNEY_PLAN.length - 1 && (
              <button
                className="btn btn--primary btn--sm"
                onClick={() => {
                  const idx = JOURNEY_PLAN.findIndex((s) => s.id === activeSection);
                  setActiveSection(JOURNEY_PLAN[idx + 1].id);
                }}
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
