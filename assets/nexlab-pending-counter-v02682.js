/* The sidebar counter is a background read, never a user mutation. */
export function createPendingCounter({
  read, onCount, enabled = true, onDelayed = () => {}, onError = () => {},
  canRun = () => true, timeoutMs = 8000, retryDelays = [5000, 15000, 45000],
  timers = globalThis
}) {
  let disposed = false, inFlight = null, controller = null, retryTimer = null;
  let retryIndex = 0, delayedReported = false;
  const clearRetry = () => {
    if (retryTimer !== null) timers.clearTimeout(retryTimer);
    retryTimer = null;
  };
  const report = (callback, value) => { try { callback(value); } catch {} };
  const denied = error => ['42501', 'PGRST301'].includes(String(error?.code || '')) ||
    /não possui acesso às pendências|nao possui acesso as pendencias|sem acesso às pendências|sem acesso as pendencias|permission denied|not authorized/i.test(String(error?.message || ''));

  async function run() {
    const current = new AbortController();
    controller = current;
    let timedOut = false, deadline = null;
    const aborted = new Promise((_, reject) => {
      current.signal.addEventListener('abort', () => reject(current.signal.reason), { once: true });
      deadline = timers.setTimeout(() => {
        timedOut = true;
        current.abort(new DOMException('Tempo de comunicação excedido.', 'TimeoutError'));
      }, timeoutMs);
    });
    try {
      const total = await Promise.race([Promise.resolve().then(() => read(current.signal)), aborted]);
      if (disposed) return;
      if (typeof total !== 'number' || !Number.isFinite(total) || total < 0) {
        throw new Error('O servidor não confirmou um contador de pendências válido.');
      }
      retryIndex = 0;
      delayedReported = false;
      onCount(total);
    } catch (error) {
      if (disposed) return;
      if (denied(error)) { clearRetry(); onCount(0); return; }
      const timeout = timedOut || error?.name === 'TimeoutError' ||
        /^(?:TimeoutError:\s*)?Tempo de comunicação excedido\.?$/i.test(String(error?.message || ''));
      if (!timeout) { report(onError, error); return; }
      // A timeout leaves the last confirmed count intact. Only bounded retries run.
      const delay = retryDelays[retryIndex++];
      if (!delayedReported) {
        delayedReported = true;
        report(onDelayed, { reason: 'timeout', retryInMs: delay ?? null });
      }
      if (delay !== undefined) {
        retryTimer = timers.setTimeout(() => {
          retryTimer = null;
          refresh({ retry: true });
        }, delay);
      }
    } finally {
      timers.clearTimeout(deadline);
      if (controller === current) controller = null;
    }
  }

  function refresh({ retry = false } = {}) {
    if (disposed) return Promise.resolve();
    if (inFlight) return inFlight;
    clearRetry();
    if (!enabled) { onCount(0); return Promise.resolve(); }
    if (!canRun()) return Promise.resolve();
    if (!retry) retryIndex = 0;
    inFlight = run().finally(() => { inFlight = null; });
    return inFlight;
  }

  return {
    refresh,
    dispose() {
      disposed = true;
      clearRetry();
      controller?.abort(new DOMException('Atualização do contador encerrada.', 'AbortError'));
    }
  };
}
