// home.js — robust battery visuals that read from localStorage and auto-update on storage events.
// Place this next to home.html and ensure home.html includes: <script src="home.js"></script>

(function () {
  const BATTERY_SEGMENTS = 10;
  const LOG_PREFIX = '[home.js]';

  function $id(id) { return document.getElementById(id); }

  function makeBatteryElement(batteryEl, statusKey) {
    if (!batteryEl) return;
    // Only build once
    if (batteryEl.dataset.built === '1') return;
    batteryEl.innerHTML = '';
    batteryEl.classList.remove('status-admitted','status-pending','status-conditional','status-rejected');
    batteryEl.classList.add('status-' + statusKey);
    for (let i = 0; i < BATTERY_SEGMENTS; i++) {
      const seg = document.createElement('div');
      seg.className = 'segment';
      seg.setAttribute('data-seg-index', i + 1);
      batteryEl.appendChild(seg);
    }
    batteryEl.dataset.built = '1';
  }

  function fillBattery(batteryEl, count) {
    if (!batteryEl) return;
    const segments = batteryEl.querySelectorAll('.segment');
    if (!segments || segments.length === 0) return;
    // The count here is the score out of 10 from universities-sync.js
    const toFill = Math.max(0, Math.min(BATTERY_SEGMENTS, Math.round(count)));
    segments.forEach((seg, idx) => {
      if (idx < toFill) seg.classList.add('filled');
      else seg.classList.remove('filled');
    });
  }

  // Reads the visual stats (the score out of 10) for battery fill
  function readVisualStats() {
    try {
      const raw = localStorage.getItem('universitiesStats');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) return null;
      return parsed;
    } catch (err) {
      console.error(`${LOG_PREFIX} failed to read/parse universitiesStats:`, err);
      return null;
    }
  }

  // --- NEW: READ RAW COUNTS ---
  // Reads the raw counts (the actual number) for the count display
  function readRawCounts() {
    try {
      const raw = localStorage.getItem('universitiesRawCounts');
      if (!raw) return { admitted: 0, pending: 0, conditional: 0, rejected: 0 };
      return JSON.parse(raw);
    } catch (err) {
      console.warn(`${LOG_PREFIX} failed to parse universitiesRawCounts:`, err);
      return { admitted: 0, pending: 0, conditional: 0, rejected: 0 };
    }
  }
  // --- END NEW ---

  function readGenericFromStorage(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      console.warn(`${LOG_PREFIX} failed to parse ${key}:`, err);
      return null;
    }
  }

  // --- UPDATED: RENDER UNIVERSITIES TO USE TWO STATS OBJECTS ---
  function renderUniversities(visualStats, rawCounts) {
    visualStats = visualStats || { admitted: 0, pending: 0, conditional: 0, rejected: 0 };
    rawCounts = rawCounts || { admitted: 0, pending: 0, conditional: 0, rejected: 0 };
    
    const mappings = [
      { id: 'uni-admitted-battery', countId: 'uni-admitted-count', key: 'admitted' },
      { id: 'uni-pending-battery', countId: 'uni-pending-count', key: 'pending' },
      { id: 'uni-conditional-battery', countId: 'uni-conditional-count', key: 'conditional' },
      { id: 'uni-rejected-battery', countId: 'uni-rejected-count', key: 'rejected' }
    ];
    mappings.forEach(m => {
      const battery = $id(m.id);
      const countEl = $id(m.countId);
      if (!battery || !countEl) return;

      makeBatteryElement(battery, m.key);
      
      // Use visualStats (score out of 10) for the battery fill
      const visualVal = (visualStats[m.key] != null) ? Number(visualStats[m.key]) : 0;
      fillBattery(battery, isNaN(visualVal) ? 0 : visualVal);
      
      // Use rawCounts (actual number) for the count display
      const rawVal = (rawCounts[m.key] != null) ? Number(rawCounts[m.key]) : 0;
      if (countEl) countEl.textContent = String(isNaN(rawVal) ? 0 : rawVal);
    });
  }
  // --- END UPDATED ---

  function renderGeneric(groupPrefix, mappingObj) {
    if (!mappingObj) return;
    // NOTE: Bursary and Residence currently display the count in both places, 
    // as their sync scripts are not provided for the percentage fix.
    Object.keys(mappingObj).forEach(key => {
      const batteryId = `${groupPrefix}-${key}-battery`;
      const countId = `${groupPrefix}-${key}-count`;
      const battery = $id(batteryId);
      const countEl = $id(countId);
      if (!battery || !countEl) return;
      makeBatteryElement(battery, key);
      const val = Number(mappingObj[key]) || 0;
      fillBattery(battery, val);
      countEl.textContent = String(val);
    });
  }

  // --- UPDATED: UPDATEALL TO USE BOTH STATS OBJECTS ---
  function updateAll() {
    const uniVisualStats = readVisualStats(); // visual scores out of 10
    const uniRawCounts = readRawCounts(); // raw number of applications

    if (uniVisualStats) renderUniversities(uniVisualStats, uniRawCounts);
    else {
      // zero out if no stats yet
      renderUniversities(
        { admitted: 0, pending: 0, conditional: 0, rejected: 0 },
        { admitted: 0, pending: 0, conditional: 0, rejected: 0 }
      );
      console.info(`${LOG_PREFIX} No universitiesStats found — ensure universities-sync.js is loaded in index.html or that index.html writes universitiesStats into localStorage.`);
    }

    const burs = readGenericFromStorage('bursariesStats');
    const res = readGenericFromStorage('residenceStats');
    renderGeneric('burs', burs);
    renderGeneric('res', res);
  }
  // --- END UPDATED ---

  // storage event handler (fired in other tabs/windows on localStorage change)
  window.addEventListener('storage', function (e) {
    if (!e) return;
    // FIX: Listen for both the visual score and the raw count key
    if (e.key === 'universitiesStats' || e.key === 'universitiesRawCounts' || e.key === 'bursariesStats' || e.key === 'residenceStats') {
      // short debounce to handle rapid updates
      clearTimeout(window.__homeUpdateTimeout);
      window.__homeUpdateTimeout = setTimeout(updateAll, 70);
    }
  });

  // make cards keyboard accessible and clickable
  function wireCards() {
    document.querySelectorAll('.app-card').forEach(card => {
      card.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          card.click();
        }
      });
      card.addEventListener('click', function () {
        const a = card.querySelector('.card-link');
        if (a && a.getAttribute('href')) {
          window.location.href = a.getAttribute('href');
          return;
        }
        if (card.dataset.target) window.location.href = card.dataset.target;
      });
    });
  }

  function wireAbout() {
    const aboutBtn = $id('about-btn');
    const modal = $id('about-modal');
    const close = $id('about-close');
    if (!aboutBtn || !modal || !close) return;
    aboutBtn.addEventListener('click', () => { modal.style.display = 'flex'; modal.setAttribute('aria-hidden', 'false'); });
    close.addEventListener('click', () => { modal.style.display = 'none'; modal.setAttribute('aria-hidden', 'true'); });
    modal.addEventListener('click', (e) => { if (e.target === modal) { modal.style.display = 'none'; modal.setAttribute('aria-hidden', 'true'); } });
  }

  // Expose a manual refresh helper for debugging
  window.homeRefreshStats = function () {
    console.info(`${LOG_PREFIX} manual refresh requested`);
    updateAll();
  };

  function init() {
    try {
      wireCards();
      wireAbout();
      updateAll();
      console.info(`${LOG_PREFIX} initialized`);
    } catch (err) {
      console.error(`${LOG_PREFIX} initialization error:`, err);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();

