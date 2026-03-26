# PerformanceIQ Onboarding Pack — v2.0

## What's new in v2.0

This pack is a **full marketing + functional onboarding system**. Version 2 adds:

- **Welcome step** — brand value proposition, feature highlights, and a S&C coach testimonial
- **Role-adaptive callout panels** — each role (Athlete, Coach, Parent, Admin, Solo) now shows a
  contextual description of what their specific dashboard looks like
- **Role-keyed accent theming** — Coach → blue, Parent → purple, Admin → amber, Athlete/Solo → green
- **Phase-aware safety callouts** — Beginner and In-Season flags surface conservative guidance notes
- **Live readiness formula** shown inline on the baseline step (transparent, citation-ready)
- **PIQ Score launch ring** — visual composite ring with breakdown on the summary screen
- **Sidebar social proof strip** — three value chips always visible during setup
- **Refined slider UI** — custom thumb, live output, track gradient
- **Checklist badge** — selected option cards show a ✓ badge in the corner
- **Scroll isolation** — content scrolls independently from the sticky footer
- All original app integration hooks are preserved and unchanged

---

## Files

| File                  | Purpose                              |
|-----------------------|--------------------------------------|
| `onboarding-piq.css`  | All styles (sidebar, main, tokens)   |
| `onboarding-piq.js`   | All logic, steps, and app bridge     |
| `README-INTEGRATION.md` | This file                          |

---

## Installation

### 1. Add to `<head>` (after your existing font links)

```html
<link rel="stylesheet" href="./onboarding-piq.css" />
```

### 2. Add before `</body>` (after your existing inline script)

```html
<script src="./onboarding-piq.js"></script>
```

That's it. The system auto-boots on `DOMContentLoaded`.

---

## How it works

- Stores all onboarding choices in `localStorage` under **`piq_onboarding_v1`**
- Opens automatically after the **first** successful login if onboarding has not been completed
- Injects a **"Guided setup"** link on the splash screen for first-time users
- On completion, pushes saved values directly into the current app UI:
  - `#navRole` ← role label
  - `#v-dashboard .page-header h1 span` ← display name
  - `#v-dashboard .page-header p` ← sport · phase · position · schedule
  - `.ring-num` ← readiness percentage
  - `.kpi-card .kpi-val.g` ← PIQ baseline score

**Safe with existing code** — does not replace `doLogin()`, `nav()`, training builder, or any
other app logic. Layers cleanly on top.

---

## Onboarding steps

| # | Step ID    | Purpose                             | Validation          |
|---|------------|-------------------------------------|---------------------|
| 0 | `welcome`  | Marketing intro / value prop        | None                |
| 1 | `role`     | Role + training track               | None (defaults set) |
| 2 | `sport`    | Sport + position                    | Sport required      |
| 3 | `goals`    | Priority outcomes (pills)           | 1+ goal required    |
| 4 | `phase`    | Experience + season phase           | Both required       |
| 5 | `schedule` | Days/week + minutes/session sliders | None                |
| 6 | `readiness`| Baseline wellness sliders           | None                |
| 7 | `summary`  | Review + launch                     | None (save on launch)|

---

## Role accent theming

The root element receives a `data-role` attribute on every selection, enabling CSS to shift the
accent color per role. The CSS file ships with:

```css
/* Coach → blue */
[data-role="Coach"]  { --piq-onb-green: #2a9df4; --piq-onb-green-dk: #1878c8; }
/* Parent → purple */
[data-role="Parent"] { --piq-onb-green: #c77dff; --piq-onb-green-dk: #9b59d4; }
/* Admin → amber */
[data-role="Admin"]  { --piq-onb-green: #ffc33a; --piq-onb-green-dk: #e0a820; }
```

Athlete and Solo use the default green token.

---

## PIQ Baseline Score formula (for transparency and display)

```
readiness   = ((energy + sleep + (6 − soreness)) / 15) × 100
schedule    = min(100, (daysPerWeek / 5) × 100)
goalsBreadth = min(100, 50 + goals.length × 10)

PIQ = (readiness × 0.45) + (schedule × 0.35) + (goalsBreadth × 0.20)
```

This is an onboarding baseline estimate only and not a clinical measure.

---

## Optional: open manually

```html
<button onclick="PIQOnboarding.open(true)">Open guided setup</button>
```

## Optional: reset for testing

```js
PIQOnboarding.reset();
location.reload();
```

## Optional: read state from other scripts

```js
const profile = PIQOnboarding.getState();
console.log(profile.role, profile.sport, profile.goals);
```
