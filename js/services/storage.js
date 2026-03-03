// /js/services/storage.js
// Safe localStorage wrapper with error boundaries and JSON helpers.

export const Storage = {
  get(key) {
    try { return window.localStorage.getItem(key); }
    catch (err) { console.warn("[Storage.get] failed", err); throw err; }
  },

  set(key, value) {
    try { window.localStorage.setItem(key, String(value)); }
    catch (err) { console.warn("[Storage.set] failed", err); throw err; }
  },

  remove(key) {
    try { window.localStorage.removeItem(key); }
    catch (err) { console.warn("[Storage.remove] failed", err); throw err; }
  },

  getJSON(key, fallback = null) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      console.warn("[Storage.getJSON] failed", err);
      return fallback;
    }
  },

  setJSON(key, obj) {
    try {
      window.localStorage.setItem(key, JSON.stringify(obj));
      return true;
    } catch (err) {
      console.warn("[Storage.setJSON] failed", err);
      return false;
    }
  }
};

export function exportPrintableReport({ state, athletes }) {
  const safe = (x) => String(x ?? "").replace(/[<>]/g, ""); // minimal HTML safety

  const printable = `
  <html>
    <head>
      <title>${safe(state?.teamName || "PerformanceIQ Report")}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { margin-bottom: 0; }
        h2 { margin-top: 30px; }
        table { border-collapse: collapse; width: 100%; margin-top: 10px; }
        th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
      </style>
    </head>
    <body>
      <h1>${safe(state?.teamName || "PerformanceIQ")}</h1>
      <p>Season: ${safe(state?.season || "-")}</p>

      <h2>Athletes</h2>
      <table>
        <thead>
          <tr><th>Name</th><th>Position</th><th>Status</th></tr>
        </thead>
        <tbody>
          ${(athletes || []).map(a => `
            <tr>
              <td>${safe(a?.name || "-")}</td>
              <td>${safe(a?.position || "-")}</td>
              <td>${safe(a?.status || "-")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </body>
  </html>`;

  const win = window.open("", "_blank");
  if (!win) throw new Error("Popup blocked — allow popups to export/print.");
  win.document.open();
  win.document.write(printable);
  win.document.close();
  win.focus();
  win.print();
}
