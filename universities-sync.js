// universities-sync.js — FIXED to use raw count directly for bar fill.

(function () {
  const LOG_PREFIX = '[universities-sync]';

  function computeFromDOMAndStore() {
    const counts = { admitted: 0, pending: 0, conditional: 0, rejected: 0 };
    const applications = [];

    // NOTE: Reading from the DOM structure you provided in index.html
    const cardEls = document.querySelectorAll('.application-card');

    cardEls.forEach(card => {
      let status = '';
      const statusEl = card.querySelector('.status');
      if (statusEl) {
        if (statusEl.classList.contains('admitted')) status = 'admitted';
        else if (statusEl.classList.contains('pending')) status = 'pending';
        else if (statusEl.classList.contains('conditional')) status = 'conditional';
        else if (statusEl.classList.contains('rejected')) status = 'rejected';
        else status = (statusEl.textContent || '').trim().toLowerCase();
      } else {
        status = (card.dataset.status || '').toLowerCase();
      }

      const nameEl = card.querySelector('h3') || card.querySelector('.uni-info h3') || null;
      const name = nameEl ? (nameEl.textContent || '').trim() : '';

      if (status.includes('admit')) counts.admitted++;
      else if (status.includes('pend')) counts.pending++;
      else if (status.includes('cond')) counts.conditional++;
      else if (status.includes('reject')) counts.rejected++;

      applications.push({ name, status });
    });

    // --- FIX: USE RAW COUNT DIRECTLY FOR VISUAL SCORE ---
    const visualStats = { admitted: 0, pending: 0, conditional: 0, rejected: 0 };
    const BATTERY_MAX = 10; 

    Object.keys(counts).forEach(key => {
      // New Logic: Set the number of bars to fill (visualStats) equal to the raw count.
      // Math.min ensures the bar never fills more than the 10 available segments.
      visualStats[key] = Math.min(counts[key], BATTERY_MAX);
    });
    // --- END FIX ---

    try {
      // 1. Store the *calculated visual scores* (now the raw count) for the Home page battery fill
      localStorage.setItem('universitiesStats', JSON.stringify(visualStats)); 
      
      // 2. Store the *raw counts* for the number displayed on the Home page
      localStorage.setItem('universitiesRawCounts', JSON.stringify(counts));
      
      localStorage.setItem('universitiesData', JSON.stringify(applications));
      
      console.info(`${LOG_PREFIX} wrote universitiesStats (visual scores now raw count)`, visualStats);
      console.info(`${LOG_PREFIX} wrote universitiesRawCounts (raw count)`, counts);
    } catch (e) {
      console.error(`${LOG_PREFIX} failed to write to localStorage:`, e);
    }

    return { counts, applications };
  }

  function attachObserver() {
    const container = document.getElementById('applications-list') || document.querySelector('.applications-list') || document.querySelector('.applications-container') || null;
    if (!container) {
      console.warn(`${LOG_PREFIX} applications container not found. Running one-time compute.`);
      computeFromDOMAndStore();
      return;
    }

    // initial compute
    computeFromDOMAndStore();

    const mo = new MutationObserver(() => {
      clearTimeout(window.__uniStatsDebounce);
      window.__uniStatsDebounce = setTimeout(() => {
        computeFromDOMAndStore();
      }, 80);
    });

    mo.observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-status'] });
    window.__uniStatsObserver = mo;
  }

  window.syncUniversitiesStats = computeFromDOMAndStore;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachObserver);
  } else attachObserver();

})();

