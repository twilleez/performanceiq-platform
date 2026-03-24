// ============================================================
// SeedDemoGate — Phase 0 triple-confirm destructive action gate
// Prevents accidental data destruction from Seed Demo trigger
// ============================================================

import React, { useState, useRef, useEffect, useId } from "react";
import { useDevice } from "../../hooks/useDevice";
import { analytics } from "../../lib/analytics";

interface SeedDemoGateProps {
  onConfirmed: () => void;
  onCancelled: () => void;
}

type Step = "warn" | "type" | "final";

const CONFIRM_PHRASE = "RESET";

export const SeedDemoGate: React.FC<SeedDemoGateProps> = ({
  onConfirmed,
  onCancelled,
}) => {
  const { isMobile } = useDevice();
  const [step, setStep] = useState<Step>("warn");
  const [typed, setTyped] = useState("");
  const [shaking, setShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogId = useId();
  const labelId = useId();

  useEffect(() => {
    analytics.track("seed_demo_gate_opened", { step: "warn" });
    // Trap focus inside modal
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    if (step === "type") {
      setTimeout(() => inputRef.current?.focus(), 100);
      analytics.track("seed_demo_gate_step", { step: "type" });
    }
    if (step === "final") {
      analytics.track("seed_demo_gate_step", { step: "final" });
    }
  }, [step]);

  const handleCancel = () => {
    analytics.track("seed_demo_gate_cancelled", { step });
    onCancelled();
  };

  const handleNextStep = () => {
    if (step === "warn") setStep("type");
    else if (step === "type") {
      if (typed.trim().toUpperCase() !== CONFIRM_PHRASE) {
        // Shake animation feedback
        setShaking(true);
        setTimeout(() => setShaking(false), 500);
        inputRef.current?.select();
        return;
      }
      setStep("final");
    } else if (step === "final") {
      analytics.track("seed_demo_confirmed");
      onConfirmed();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") handleCancel();
    if (e.key === "Enter") handleNextStep();
  };

  const steps: Record<Step, { title: string; body: string; cta: string; ctaDanger: boolean }> = {
    warn: {
      title: "⚠️ Destructive Action",
      body: "Loading Seed Demo data will permanently overwrite ALL your existing athlete records, training logs, nutrition data, and analytics history. This cannot be undone.",
      cta: "I understand, continue",
      ctaDanger: false,
    },
    type: {
      title: "Confirm by typing RESET",
      body: `Type the word "${CONFIRM_PHRASE}" exactly to confirm you want to overwrite all your data with demo content.`,
      cta: "Continue",
      ctaDanger: false,
    },
    final: {
      title: "Last chance",
      body: "Your data will be permanently deleted. Demo data will replace it. There is no recovery option. Are you absolutely sure?",
      cta: "Yes, delete my data and load demo",
      ctaDanger: true,
    },
  };

  const current = steps[step];
  const isTypeStepValid = step !== "type" || typed.trim().toUpperCase() === CONFIRM_PHRASE;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelId}
      id={dialogId}
      onKeyDown={handleKeyDown}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,10,20,0.7)",
        zIndex: 400,
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        padding: isMobile ? 0 : "16px",
      }}
      onClick={(e) => e.target === e.currentTarget && handleCancel()}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: isMobile ? "20px 20px 0 0" : "14px",
          padding: isMobile ? "24px 24px calc(24px + env(safe-area-inset-bottom))" : "32px",
          width: "100%",
          maxWidth: "440px",
          boxShadow: "0 16px 48px rgba(0,0,0,.2)",
        }}
      >
        {/* Step indicator */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
          {(["warn", "type", "final"] as Step[]).map((s, i) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: i <= (["warn","type","final"].indexOf(step))
                  ? "#C0392B"
                  : "#e8e6e0",
                transition: "background 250ms ease",
              }}
            />
          ))}
        </div>

        {/* Title */}
        <h2
          id={labelId}
          style={{
            fontFamily: "'Barlow Condensed',sans-serif",
            fontSize: 22,
            fontWeight: 800,
            color: step === "final" ? "#C0392B" : "#1a1a2e",
            marginBottom: 12,
          }}
        >
          {current.title}
        </h2>

        {/* Body */}
        <p style={{ fontSize: 14, color: "#4a4a62", lineHeight: 1.65, marginBottom: 20 }}>
          {current.body}
        </p>

        {/* Type-to-confirm input */}
        {step === "type" && (
          <div
            style={{
              marginBottom: 20,
              animation: shaking ? "shake 0.4s ease" : "none",
            }}
          >
            <label
              htmlFor="seed-confirm-input"
              style={{ fontSize: 12, fontWeight: 700, color: "#6b6b80", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6, display: "block" }}
            >
              Type "{CONFIRM_PHRASE}" to continue
            </label>
            <input
              id="seed-confirm-input"
              ref={inputRef}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
              style={{
                width: "100%",
                height: 44,
                border: `2px solid ${typed.length > 0 && typed.toUpperCase() !== CONFIRM_PHRASE ? "#C0392B" : "#e8e6e0"}`,
                borderRadius: 8,
                padding: "0 14px",
                fontFamily: "'DM Mono',monospace",
                fontSize: 16,
                color: "#1a1a2e",
                outline: "none",
                transition: "border-color 150ms ease",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#1A5276")}
              onBlur={(e) => {
                if (typed.length === 0) e.target.style.borderColor = "#e8e6e0";
              }}
            />
            {typed.length > 0 && typed.toUpperCase() !== CONFIRM_PHRASE && (
              <p style={{ fontSize: 12, color: "#C0392B", marginTop: 4 }} role="alert">
                Type exactly: {CONFIRM_PHRASE}
              </p>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10, flexDirection: isMobile ? "column-reverse" : "row" }}>
          <button
            onClick={handleCancel}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 8,
              border: "1px solid #e8e6e0",
              background: "#fff",
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 14,
              fontWeight: 600,
              color: "#4a4a62",
              cursor: "pointer",
              transition: "background 150ms ease",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleNextStep}
            disabled={step === "type" && !isTypeStepValid}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 8,
              border: "none",
              background: current.ctaDanger
                ? "#C0392B"
                : isTypeStepValid ? "#1A5276" : "#ccc",
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 14,
              fontWeight: 700,
              color: "#fff",
              cursor: isTypeStepValid ? "pointer" : "not-allowed",
              transition: "background 150ms ease",
            }}
          >
            {current.cta}
          </button>
        </div>

        <style>{`
          @keyframes shake {
            0%,100% { transform: translateX(0); }
            20%,60% { transform: translateX(-6px); }
            40%,80% { transform: translateX(6px); }
          }
        `}</style>
      </div>
    </div>
  );
};
