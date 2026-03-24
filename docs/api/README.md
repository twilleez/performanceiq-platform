================================================================
FILE: docs/api/README.md
================================================================

# PIQ Recovery — API Documentation

## Authentication
All protected routes require `Authorization: Bearer <supabase_jwt>` header.
Obtain JWT from Supabase Auth: `supabase.auth.getSession()`.

---

## Phase 0 — Safety

### POST /api/seed-demo
Overwrites all user data with demo content. Requires triple-confirm gate completion.

**Body:**
```json
{ "confirmed": true }
```
**Response:** `{ "success": true, "message": "Demo data loaded." }`
**Errors:** `400` if `confirmed !== true` | `401` if unauthenticated

---

### POST /api/seed-demo/undo
Restores data within 10-second undo window.

**Response:** `{ "success": true }` | `400` if window expired

---

## Phase 3 — Retention

### POST /api/notifications/subscribe
Registers a push subscription for this user/device.

**Body:**
```json
{
  "endpoint": "https://fcm.googleapis.com/...",
  "keys": { "p256dh": "...", "auth": "..." },
  "deviceType": "android"
}
```
**Response:** `{ "success": true }`

---

### DELETE /api/notifications/unsubscribe
**Body:** `{ "endpoint": "https://..." }`

---

### POST /api/streak/update
Recalculates streak after a new log. Called automatically — no body required.
**Response:** `{ "streak": { "current_streak": 7, "longest_streak": 14, "streak_at_risk": false } }`

---

### GET /api/streak
**Response:** `{ "streak": { "current_streak": 7, "longest_streak": 14, "last_log_date": "2025-03-22", "streak_at_risk": false } }`

---

## Phase 4 — Workflows

### POST /api/reports/generate
Generates a PDF progress report for an athlete.

**Body:**
```json
{
  "athleteId": "uuid",
  "dateFrom": "2025-03-01",
  "dateTo": "2025-03-22",
  "coachNotes": "Great improvement in compliance this month.",
  "expiresIn": "30d"
}
```
**expiresIn options:** `"7d"` | `"30d"` | `"90d"` | `"permanent"`

**Response:**
```json
{
  "reportId": "report_1234_abc",
  "shareUrl": "https://storage.supabase.co/..."
}
```
**Errors:** `400` missing fields | `403` no access to athlete | `500` generation failed

---

### GET /api/reports/:reportId
Public endpoint — no auth required. Returns PDF stream.
Parents open this URL directly.

**Response:** `application/pdf` stream

---

### POST /api/nutrition/log
**Body:**
```json
{
  "food_name": "Chicken Breast",
  "meal_type": "lunch",
  "serving_size": 150,
  "serving_unit": "g",
  "calories": 248,
  "protein_g": 46,
  "carbs_g": 0,
  "fat_g": 5.4,
  "barcode": "012345678901",
  "source": "barcode"
}
```
**source options:** `"manual"` | `"barcode"` | `"search"` | `"recent"`
**meal_type options:** `"breakfast"` | `"lunch"` | `"dinner"` | `"snack"` | `"supplement"`

---

### GET /api/nutrition/daily?date=2025-03-22
**Response:**
```json
{
  "entries": [...],
  "totals": { "calories": 1840, "protein": 142, "carbs": 198, "fat": 54 },
  "date": "2025-03-22"
}
```

---

## Cron Jobs (Internal — protected by `x-cron-secret` header)

### POST /api/cron/daily-streak
Runs at 3pm user local time. Sends streak reminders + milestone notifications.

### POST /api/cron/weekly-parent
Runs Sunday 7pm. Sends weekly athlete summaries to parents.

---

## Error Format
All errors follow:
```json
{ "error": "Human-readable error message" }
```
Status codes: `400` bad request | `401` unauthenticated | `403` forbidden | `404` not found | `500` server error
