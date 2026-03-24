// ============================================================
// Backend server entry point
// Express + all API routes + CORS for GitHub Pages origin
// ============================================================

import express from "express";
import cors from "cors";
import apiRouter from "./routes/api";

const app  = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({
  origin: [
    "https://twilleez.github.io",
    "http://localhost:5173",
    "http://localhost:3000",
  ],
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (_req, res) => res.json({ status: "ok", ts: new Date().toISOString() }));

// All PIQ API routes under /api
app.use("/api", apiRouter);

app.listen(PORT, () => {
  console.log(`PIQ backend running on port ${PORT}`);
});

export default app;
