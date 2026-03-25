{
  "name": "piq-recovery-backend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev":        "ts-node-dev --respawn src/index.ts",
    "build":      "tsc",
    "start":      "node dist/index.js",
    "lint":       "eslint src --ext .ts",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "express":               "^4.19.0",
    "pdfkit":                "^0.15.0",
    "web-push":              "^3.6.7"
  },
  "devDependencies": {
    "@types/express":        "^4.17.21",
    "@types/node":           "^20.12.0",
    "@types/web-push":       "^3.6.3",
    "@types/pdfkit":         "^0.13.3",
    "ts-node-dev":           "^2.0.0",
    "typescript":            "^5.4.0"
  }
}
