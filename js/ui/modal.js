// /js/ui/modal.js
// Lightweight confirm modal that matches app design language (uses existing CSS if present).

export function confirmModal({ title = "Confirm", message = "", confirmText = "Confirm", cancelText = "Cancel" } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "piq-modal-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    const card = document.createElement("div");
    card.className = "piq-modal-card";
    card.innerHTML = `
      <div class="piq-modal-title">${escapeHtml(title)}</div>
      <div class="piq-modal-msg">${escapeHtml(message)}</div>
      <div class="piq-modal-actions">
        <button class="btn ghost" type="button" data-act="cancel">${escapeHtml(cancelText)}</button>
        <button class="btn danger" type="button" data-act="confirm">${escapeHtml(confirmText)}</button>
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    function cleanup(val) {
      overlay.remove();
      resolve(val);
    }

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cleanup(false);
    });

    card.querySelector('[data-act="cancel"]')?.addEventListener("click", () => cleanup(false));
    card.querySelector('[data-act="confirm"]')?.addEventListener("click", () => cleanup(true));
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}
