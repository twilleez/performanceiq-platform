{
  "name": "piq-recovery-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev":        "vite",
    "build":      "tsc && vite build",
    "preview":    "vite preview",
    "lint":       "eslint src --ext .ts,.tsx",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "react":                 "^18.3.0",
    "react-dom":             "^18.3.0"
  },
  "devDependencies": {
    "@types/react":          "^18.3.0",
    "@types/react-dom":      "^18.3.0",
    "@vitejs/plugin-react":  "^4.3.0",
    "typescript":            "^5.4.0",
    "vite":                  "^5.3.0"
  }
}
