// authStore.js (plain script)
(function () {
  "use strict";
  if (window.PIQ_AuthStore) return;

  const api = {
    // stub: add auth later
    user: () => null
  };

  window.PIQ_AuthStore = api;
})();
