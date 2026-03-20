/** PIQ Score explainer tooltip — shows once for new users. */
export const piqExplainer = {
  init() {
    if (localStorage.getItem('piq_explainer_seen')) return;
    requestAnimationFrame(() => setTimeout(() => this._show(), 400));
  },
  _show() {
    localStorage.setItem('piq_explainer_seen','1');
  }
};
