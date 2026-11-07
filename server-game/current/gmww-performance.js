/* GMWW GM iPhone - device-local rendering guard. No game logic, server state or Player Web changes. */
(function (g) {
  'use strict';
  const KEY = 'GMWW_GM_PERFORMANCE_V1';
  const DEFAULTS = Object.freeze({mode:'auto',loopGuard:true,effects:true,idle:true});
  const MODES = new Set(['auto','save','high']);
  const doc = g.document;
  function sanitize(value) {
    const row = value && typeof value === 'object' ? value : {};
    return {
      mode: MODES.has(row.mode) ? row.mode : DEFAULTS.mode,
      loopGuard: true, // A duplicate render scheduler is never a user-selectable feature.
      effects: row.effects !== false,
      idle: row.idle !== false
    };
  }
  function read() {
    try { return sanitize(JSON.parse(g.localStorage.getItem(KEY) || 'null')); }
    catch (_) { return {...DEFAULTS}; }
  }
  let settings = read();
  let slowFrames = 0, pressureUntil = 0, pressured = false;
  const metrics = {slowFrames:0, framesObserved:0, reducedTransitions:0};
  const PREV_KEY = 'GMWW_GM_PERFORMANCE_PREV_V1';
  const frameTimes = [], longTasks = [];
  const activeIntervals = new Set();
  const rawSetInterval = typeof g.setInterval === 'function' ? g.setInterval.bind(g) : null;
  // Count live intervals (GM polling/animation timers). Behaviour of setInterval/clearInterval is unchanged.
  if (rawSetInterval && typeof g.clearInterval === 'function' && !g.__gmwwTimerCount) {
    const rawClear = g.clearInterval.bind(g);
    g.__gmwwTimerCount = true;
    g.setInterval = function () { const id = rawSetInterval.apply(null, arguments); activeIntervals.add(id); return id; };
    g.clearInterval = function (id) { activeIntervals.delete(id); return rawClear(id); };
  }
  try {
    if (g.PerformanceObserver && (g.PerformanceObserver.supportedEntryTypes || []).includes('longtask')) {
      new g.PerformanceObserver(function (list) {
        const now = Date.now();
        for (const entry of list.getEntries()) longTasks.push({at:now, ms:entry.duration});
        while (longTasks.length > 200) longTasks.shift();
      }).observe({entryTypes:['longtask']});
    }
  } catch (_) {}
  function reduced() {
    return !!settings.effects && (settings.mode === 'save' || (settings.mode === 'auto' && pressured));
  }
  function canRender() {
    if (doc.hidden) return false;
    if (!settings.idle) return true;
    const stage = doc.getElementById('start');
    return !stage || stage.classList.contains('active');
  }
  function freezeIdle() {
    return settings.idle && settings.mode !== 'high';
  }
  function frameInterval(active, count) {
    const base = count >= 16 ? 1000 / 24 : 1000 / 30;
    if (settings.mode === 'high') return base;
    if (!active && freezeIdle()) return 750;
    if (settings.mode === 'save') return active ? 120 : 250;
    return active ? (pressured ? 120 : 66) : base;
  }
  function snapshot() {
    const now = Date.now();
    const recent = frameTimes.filter(function (t) { return now - t <= 5000; }).length;
    const slowPercent = metrics.framesObserved ? Math.round(metrics.slowFrames / metrics.framesObserved * 1000) / 10 : 0;
    const heap = g.performance && g.performance.memory && g.performance.memory.usedJSHeapSize;
    return {
      fps: Math.round(recent / 5 * 10) / 10,
      slowPercent: slowPercent,
      timers: activeIntervals.size,
      longTasks60s: g.PerformanceObserver && (g.PerformanceObserver.supportedEntryTypes || []).includes('longtask')
        ? longTasks.filter(function (t) { return now - t.at <= 60000; }).length : null,
      heapMb: Number.isFinite(heap) ? Math.round(heap / 1048576) : null,
      mode: settings.mode, pressured: pressured
    };
  }
  function lite() {
    if (settings.mode !== 'save') {
      try { g.localStorage.setItem(PREV_KEY, settings.mode); } catch (_) {}
      return set({mode:'save', effects:true, idle:true});
    }
    let previous = 'auto';
    try { const stored = g.localStorage.getItem(PREV_KEY); if (MODES.has(stored) && stored !== 'save') previous = stored; } catch (_) {}
    return set({mode:previous});
  }
  function paintMetrics() {
    if (!doc || doc.hidden) return;
    const page = doc.getElementById('settings');
    if (page && page.classList && !page.classList.contains('active')) return;
    const s = snapshot(), text = function (id, value) { const el = doc.getElementById(id); if (el) el.textContent = value; };
    text('gmwwPerfFps', s.fps + ' khung/giây');
    text('gmwwPerfSlow', s.slowPercent + '% khung trễ');
    text('gmwwPerfTimers', s.timers + ' bộ đếm chạy');
    text('gmwwPerfLong', s.longTasks60s === null ? 'Không hỗ trợ' : s.longTasks60s + ' tác vụ nặng/phút');
    text('gmwwPerfHeap', s.heapMb === null ? 'Không hỗ trợ' : s.heapMb + ' MB');
    const lite = doc.getElementById('gmwwPerfLite');
    if (lite) lite.textContent = s.mode === 'save' ? 'KHÔI PHỤC CHẾ ĐỘ' : 'CHẾ ĐỘ NHẸ 1 CHẠM';
  }
  function updateView() {
    if (!doc) return;
    const root = doc.documentElement;
    if (root) {
      root.dataset.gmwwPerfReduced = reduced() ? 'true' : 'false';
      root.dataset.gmwwPerfMode = settings.mode;
    }
    const status = doc.getElementById('gmwwPerfStatus');
    if (status) status.textContent = settings.mode === 'save' ? 'Đang ưu tiên tiết kiệm đồ họa'
      : settings.mode === 'high' ? 'Ưu tiên hình ảnh; chống lặp vẫn bật'
      : pressured && settings.effects ? 'Đang giảm hiệu ứng vì khung hình trễ'
      : 'Tự động • đang giám sát tải đồ họa';
    const indicator = doc.getElementById('gmwwPerfGuard');
    if (indicator) indicator.checked = true;
    for (const id of ['gmwwPerfEffects','gmwwPerfIdle']) {
      const box = doc.getElementById(id);
      if (box) box.checked = id === 'gmwwPerfEffects' ? settings.effects : settings.idle;
    }
    const select = doc.getElementById('gmwwPerfMode');
    if (select) select.value = settings.mode;
  }
  function observeFrame(delta, expected, active) {
    metrics.framesObserved++;
    frameTimes.push(Date.now()); while (frameTimes.length > 120) frameTimes.shift();
    if (settings.mode !== 'auto' || !active) return;
    const delayed = Number.isFinite(delta) && delta > Math.max(180, expected * 2.5);
    slowFrames = delayed ? Math.min(8, slowFrames+1) : Math.max(0, slowFrames-1);
    if (delayed) metrics.slowFrames++;
    const before = pressured;
    if (slowFrames >= 3) {
      pressured = true;
      pressureUntil = Date.now() + 20000;
    } else if (!slowFrames && Date.now() > pressureUntil) pressured = false;
    if (before !== pressured) {
      metrics.reducedTransitions++;
      updateView();
    }
  }
  function set(partial) {
    settings = sanitize({...settings,...partial});
    if (settings.mode !== 'auto') { pressured = false; slowFrames = 0; }
    try { g.localStorage.setItem(KEY, JSON.stringify(settings)); }
    catch (_) {}
    updateView();
    return {...settings};
  }
  function bindSettings() {
    const select = doc.getElementById('gmwwPerfMode');
    if (!select || select.dataset.bound === 'true') return;
    select.dataset.bound = 'true';
    select.addEventListener('change', function () { set({mode:select.value}); });
    const effects = doc.getElementById('gmwwPerfEffects');
    const idle = doc.getElementById('gmwwPerfIdle');
    if (effects) effects.addEventListener('change', function () { set({effects:effects.checked}); });
    if (idle) idle.addEventListener('change', function () { set({idle:idle.checked}); });
    const liteButton = doc.getElementById('gmwwPerfLite');
    if (liteButton && liteButton.dataset.bound !== 'true') {
      liteButton.dataset.bound = 'true';
      liteButton.addEventListener('click', function () { lite(); paintMetrics(); });
    }
    if (rawSetInterval && !g.__gmwwPerfPaint) { g.__gmwwPerfPaint = true; rawSetInterval(paintMetrics, 2000); }
    updateView(); paintMetrics();
  }
  g.GMWW_PERFORMANCE = Object.freeze({
    get: function () { return {...settings}; },
    set:set, reduced:reduced, canRender:canRender,
    freezeIdle:freezeIdle, frameInterval:frameInterval, observeFrame:observeFrame,
    metrics:function () { return {...metrics,pressure:pressured}; },
    snapshot:snapshot, lite:lite
  });
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded',bindSettings,{once:true});
  else bindSettings();
  updateView();
})(globalThis);
