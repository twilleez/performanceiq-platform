/**
 * PerformanceIQ — UX Improvement Code Blocks
 * 3 actionable improvements from the audit:
 *
 * 1. Role-aware nav badge in sidebar header
 * 2. Floating label input component
 * 3. Inline validation on auth/onboarding forms
 */

/* ============================================================
   UX IMPROVEMENT 1: Role-aware sidebar header with role badge
   Drop-in replacement for buildSidebar() logo section in nav.js
   ============================================================ */

export function buildSidebarHeader(role) {
  const ROLE_LABELS = {
    coach:   { label: 'Coach',       color: '#39e66b' },
    player:  { label: 'Athlete',     color: '#2a9df4' },
    athlete: { label: 'Athlete',     color: '#2a9df4' },
    parent:  { label: 'Parent',      color: '#ff6b35' },
    solo:    { label: 'Solo Athlete',color: '#39e66b' },
    admin:   { label: 'Admin',       color: '#94a3b8' },
  };
  const r = ROLE_LABELS[role] || { label: role, color: '#94a3b8' };

  return `
    <div class="sidebar-logo" style="flex-direction:column;align-items:flex-start;gap:6px;padding:16px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <img src="assets/logo-mark.svg" class="sidebar-logo-mark" width="28" height="28" alt="PIQ">
        <span class="sidebar-wordmark">PIQ</span>
      </div>
      <span class="role-badge" style="background:${r.color}14;color:${r.color};border-color:${r.color}33;
                                      font-size:10px;padding:2px 10px;letter-spacing:0.1em;">
        ${r.label}
      </span>
    </div>`;
}

/* CSS additions for sidebar role badge — add to styles.css */
/*
.sidebar-logo {
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}
.sidebar-role-badge {
  font-family: var(--font-data);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 2px 10px;
  border-radius: var(--r-full);
  border: 1px solid;
  transition: color var(--dur-fast), background var(--dur-fast);
}
*/


/* ============================================================
   UX IMPROVEMENT 2: Floating label input component
   Replaces plain <input> + <label> pairs in auth/onboarding forms.
   Placeholder animates up on focus or when value is filled.
   ============================================================ */

/**
 * buildFloatingInput({ id, label, type, value, required })
 * Returns HTML string. Insert with innerHTML.
 * Requires the CSS block below in styles.css.
 */
export function buildFloatingInput({ id, label, type = 'text', value = '', required = false }) {
  return `
    <div class="float-field ${value ? 'has-value' : ''}">
      <input
        id="${id}"
        name="${id}"
        type="${type}"
        value="${value}"
        autocomplete="${type === 'email' ? 'email' : type === 'password' ? 'current-password' : 'off'}"
        ${required ? 'required' : ''}
        class="float-input"
        placeholder=" "
        oninput="piqValidate(this)"
        onfocus="this.closest('.float-field').classList.add('focused')"
        onblur="this.closest('.float-field').classList.remove('focused');piqValidateBlur(this)"
      >
      <label for="${id}" class="float-label">${label}</label>
      <span class="float-status" aria-live="polite"></span>
    </div>`;
}

/* CSS — add to styles.css */
/*
.float-field {
  position: relative;
  margin-bottom: 20px;
}
.float-input {
  width: 100%;
  padding: 20px 14px 8px;
  background: var(--bg-input);
  border: 1.5px solid var(--border);
  border-radius: var(--r-sm);
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--text-primary);
  transition: border-color var(--dur-fast), box-shadow var(--dur-fast);
}
.float-input:focus {
  outline: none;
  border-color: var(--brand-primary);
  box-shadow: 0 0 0 3px var(--brand-primary-subtle);
}
.float-label {
  position: absolute;
  left: 14px;
  top: 14px;
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--text-muted);
  pointer-events: none;
  transition: top var(--ease-spring) var(--dur-base),
              font-size var(--ease-spring) var(--dur-base),
              color var(--dur-fast);
  transform-origin: left top;
}
.float-input:not(:placeholder-shown) ~ .float-label,
.float-field.focused .float-label {
  top: 7px;
  font-size: 10px;
  font-family: var(--font-data);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.float-field.focused .float-label {
  color: var(--brand-primary);
}
.float-input.valid {
  border-color: var(--brand-primary);
}
.float-input.invalid {
  border-color: var(--brand-accent);
  box-shadow: 0 0 0 3px rgba(255,107,53,0.1);
}
.float-status {
  display: block;
  font-family: var(--font-data);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  margin-top: 4px;
  min-height: 16px;
  transition: color var(--dur-fast);
}
.float-status.ok  { color: var(--brand-primary); }
.float-status.err { color: var(--brand-accent); }
*/


/* ============================================================
   UX IMPROVEMENT 3: Inline validation helpers
   Attach to oninput / onblur on auth + onboarding inputs.
   Works with the float-field structure above.
   ============================================================ */

const VALIDATORS = {
  email:    { test: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), msg: 'Enter a valid email' },
  password: { test: v => v.length >= 8,                          msg: 'Minimum 8 characters' },
  text:     { test: v => v.trim().length >= 2,                   msg: 'Required' },
  number:   { test: v => !isNaN(parseFloat(v)),                  msg: 'Enter a number' },
};

/**
 * Call from oninput to show live status while the user types.
 * Only marks valid (green tick) while typing — never red until blur.
 */
export function piqValidate(input) {
  const type = input.dataset.validate || input.type;
  const v = VALIDATORS[type] || VALIDATORS.text;
  const field = input.closest('.float-field');
  const status = field?.querySelector('.float-status');

  if (!input.value) {
    input.classList.remove('valid', 'invalid');
    if (status) { status.textContent = ''; status.className = 'float-status'; }
    return;
  }
  if (v.test(input.value)) {
    input.classList.add('valid');
    input.classList.remove('invalid');
    if (status) { status.textContent = '✓'; status.className = 'float-status ok'; }
  } else {
    input.classList.remove('valid', 'invalid'); // don't red until blur
    if (status) { status.textContent = ''; status.className = 'float-status'; }
  }
}

/**
 * Call from onblur to show red error if still invalid after leaving.
 */
export function piqValidateBlur(input) {
  const type = input.dataset.validate || input.type;
  const v = VALIDATORS[type] || VALIDATORS.text;
  const field = input.closest('.float-field');
  const status = field?.querySelector('.float-status');

  if (!input.value && !input.required) return;

  if (v.test(input.value)) {
    input.classList.add('valid');
    input.classList.remove('invalid');
    if (status) { status.textContent = '✓'; status.className = 'float-status ok'; }
  } else {
    input.classList.remove('valid');
    input.classList.add('invalid');
    if (status) { status.textContent = v.msg; status.className = 'float-status err'; }
  }
}

/**
 * Validate all inputs in a form before submission.
 * Returns true if all valid, false otherwise.
 * Call this at the top of your signIn / signUp handlers.
 */
export function piqValidateForm(formEl) {
  const inputs = formEl.querySelectorAll('.float-input[required]');
  let allValid = true;
  inputs.forEach(input => {
    piqValidateBlur(input);
    if (input.classList.contains('invalid') || !input.value) allValid = false;
  });
  return allValid;
}

/* ── Usage example in auth.js ────────────────────────────────────────────────
import { buildFloatingInput, piqValidate, piqValidateBlur, piqValidateForm } from '../data/uxHelpers.js';
import { buildSidebarHeader } from '../data/uxHelpers.js';

// In your sign-in view render:
function renderSignIn() {
  return `
    <form id="signin-form">
      ${buildFloatingInput({ id:'email',    label:'Email address', type:'email',    required:true })}
      ${buildFloatingInput({ id:'password', label:'Password',      type:'password', required:true })}
      <button type="button" class="btn btn-primary btn-full" onclick="handleSignIn()">Sign In</button>
    </form>`;
}

// In handleSignIn():
function handleSignIn() {
  const form = document.getElementById('signin-form');
  if (!piqValidateForm(form)) return; // blocks if invalid, shows errors
  // ... proceed with Supabase auth
}

// In buildSidebar(), replace the logo section:
function buildSidebar(role, activeRoute) {
  return `
    <nav class="sidebar">
      ${buildSidebarHeader(role)}
      ...nav items...
    </nav>`;
}
*/
