/**
 * GMWW Demo runner (isolated orchestration, never writes to real rooms).
 * The adapter must implement snapshot(), legalActions(snapshot), apply(action),
 * and advance(). Every call is gated by an explicit demo room identifier.
 */
export function createDemoRunner(adapter, options = {}) {
  if (!adapter || typeof adapter.snapshot !== 'function' ||
      typeof adapter.legalActions !== 'function' ||
      typeof adapter.apply !== 'function' ||
      typeof adapter.advance !== 'function') {
    throw new TypeError('Demo adapter must supply snapshot, legalActions, apply and advance');
  }
  const room = String(options.roomCode || '');
  if (!room || options.isDemoRoom !== true) {
    throw new Error('Demo runner requires an explicitly isolated demo room');
  }
  const random = options.random || Math.random;
  const onChange = typeof options.onChange === 'function' ? options.onChange : () => {};
  const delayMs = Number.isFinite(options.delayMs) ? Math.max(0, options.delayMs) : 750;
  const wait = options.wait || (ms => new Promise(resolve => setTimeout(resolve, ms)));
  let status = 'paused';
  let epoch = 0;
  let loop = null;
  let steps = 0;
  let lastError = null;
  const info = () => ({ roomCode: room, status, steps, lastError });
  const notify = () => onChange(info());
  const assertRoom = snapshot => {
    if (!snapshot || String(snapshot.roomCode) !== room ||
        snapshot.isDemoRoom !== true) {
      throw new Error('Demo room boundary violation');
    }
  };
  async function tick(token = epoch) {
    if (status !== 'running' || token !== epoch) return false;
    const snapshot = await adapter.snapshot();
    assertRoom(snapshot);
    if (snapshot.finished) {
      status = 'finished';
      epoch++;
      notify();
      return false;
    }
    const optionsList = await adapter.legalActions(snapshot);
    if (!Array.isArray(optionsList)) throw new TypeError('legalActions must return an array');
    if (token !== epoch || status !== 'running') return false;
    if (optionsList.length) {
      const value = Number(random());
      const index = Math.min(optionsList.length - 1,
        Math.max(0, Math.floor((Number.isFinite(value) ? value : 0) * optionsList.length)));
      await adapter.apply(optionsList[index], snapshot);
    } else {
      await adapter.advance(snapshot);
    }
    steps++;
    notify();
    return true;
  }
  async function run(token) {
    while (status === 'running' && token === epoch) {
      try {
        if (!(await tick(token))) break;
        await wait(delayMs);
      } catch (error) {
        if (token !== epoch) break;
        lastError = String(error?.message || error);
        status = 'error';
        epoch++;
        notify();
        break;
      }
    }
  }
  function resume() {
    if (status === 'running' || status === 'finished' || status === 'stopped') return info();
    lastError = null;
    status = 'running';
    const token = ++epoch;
    notify();
    loop = run(token);
    return info();
  }
  function pause() {
    if (status !== 'running') return info();
    status = 'paused';
    epoch++;
    notify();
    return info();
  }
  function stop() {
    if (status === 'stopped') return info();
    status = 'stopped';
    epoch++;
    notify();
    return info();
  }
  return Object.freeze({ info, resume, pause, stop, get pending() { return loop; } });
}
