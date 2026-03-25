// ============================================================
// BodyView — Nutrition + Recovery + Body Metrics
// ============================================================

import React, { useState } from "react";
import { useAppStore } from "../context/AppStore";
import { NutritionLogger } from "../components/nutrition/NutritionLogger";
import { analytics } from "../lib/analytics";

type BodySubPage = "nutrition" | "recovery" | "metrics";

export default function BodyView() {
  const { user } = useAppStore();
  const [subPage, setSubPage] = useState<BodySubPage>("nutrition");

  const SUB_PAGES = [
    { id: "nutrition" as BodySubPage, label: "Nutrition", icon: "🥗" },
    { id: "recovery"  as BodySubPage, label: "Recovery",  icon: "🛌" },
    { id: "metrics"   as BodySubPage, label: "Body",      icon: "📏" },
  ];

  return (
    <div className="piq-page">
      {/* Sub-nav */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {SUB_PAGES.map(sp => (
          <button key={sp.id} onClick={() => { setSubPage(sp.id); analytics.track("body_subnav", { page: sp.id }); }}
            style={{
              padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
              minHeight: 36, minWidth: "auto",
              border: `1.5px solid ${subPage === sp.id ? "var(--theme-primary)" : "var(--border-default)"}`,
              background: subPage === sp.id ? "var(--theme-primary)" : "var(--bg-card)",
              color: subPage === sp.id ? "#fff" : "var(--text-secondary)",
              transition: "all 150ms ease",
            }}
          >
            {sp.icon} {sp.label}
          </button>
        ))}
      </div>

      {subPage === "nutrition" && user && (
        <NutritionLogger userId={user.id} />
      )}

      {subPage === "recovery" && (
        <div style={{ textAlign: "center", padding: "40px 20px", background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 12 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🛌</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Recovery Tracking</div>
          <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.65, maxWidth: 340, margin: "0 auto" }}>
            Sleep quality and HRV will display here once Apple Health or Google Fit is connected.
          </p>
        </div>
      )}

      {subPage === "metrics" && (
        <div style={{ textAlign: "center", padding: "40px 20px", background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 12 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📏</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Body Metrics</div>
          <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.65 }}>Track weight, body composition, and other physical measurements over time.</p>
        </div>
      )}
    </div>
  );
}
