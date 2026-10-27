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
    updateView();
  }
  g.GMWW_PERFORMANCE = Object.freeze({
    get: function () { return {...settings}; },
    set:set, reduced:reduced, canRender:canRender,
    freezeIdle:freezeIdle, frameInterval:frameInterval, observeFrame:observeFrame,
    metrics:function () { return {...metrics,pressure:pressured}; }
  });
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded',bindSettings,{once:true});
  else bindSettings();
  updateView();
})(globalThis);
