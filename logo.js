/**
 * Logo URI — reads from the DOM img tag injected by index.html.
 * This keeps the 200KB base64 string OUT of the JS module parse chain.
 */
export const LOGO_URI = document.getElementById('piq-logo-data')?.src || '';
