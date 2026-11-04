// Privacy is verified per account. Refreshing an already verified account must
// not unmount its workspace or discard unsaved form state.
export function createPrivacyVerifier({ readSession, readStatus, onStatus }) {
  let userId = null;
  let generation = 0;
  let status = null;
  let pending = null;

  function reset(nextUserId = null) {
    generation += 1;
    userId = nextUserId == null ? null : String(nextUserId);
    pending = null;
    status = {
      loading: true,
      refreshing: false,
      verified: false,
      requires_acknowledgement: false,
      migration_missing: false,
      check_error: null
    };
    onStatus(status);
  }

  function check(expectedUserId) {
    const expected = expectedUserId == null ? null : String(expectedUserId);
    if (expected !== userId || !status) reset(expected);
    if (!expected) return Promise.resolve(null);
    if (pending) return pending;

    const requestGeneration = generation;
    const previous = status;
    const current = () => generation === requestGeneration && userId === expected;
    const publish = (next) => {
      if (!current()) return null;
      status = next;
      onStatus(next);
      return next;
    };

    publish({
      ...previous,
      loading: !previous.verified,
      refreshing: true,
      check_error: null
    });

    // Defer the request so simultaneous focus/visibility/auth events share it.
    const request = Promise.resolve().then(async () => {
      try {
        const sessionResult = await readSession();
        if (!current()) return null;
        if (sessionResult?.error) throw sessionResult.error;
        if (String(sessionResult?.data?.session?.user?.id || '') !== expected) {
          throw { code: 'privacy_session_changed' };
        }

        const result = await readStatus();
        if (!current()) return null;
        if (result?.error) throw result.error;
        const data = result?.data;
        if (!data || data.ok === false || typeof data.requires_acknowledgement !== 'boolean') {
          throw { code: 'privacy_invalid_response' };
        }
        return publish({
          ...data,
          loading: false,
          refreshing: false,
          verified: true,
          migration_missing: false,
          check_error: null
        });
      } catch (error) {
        if (!current()) return null;
        const code = String(error?.code || '');
        const sessionChanged = code === 'privacy_session_changed';
        // PGRST202 can also mean a stale schema cache, not a missing migration.
        const serviceMissing = code === 'PGRST202' || code === '42883';
        return publish({
          ...previous,
          loading: false,
          refreshing: false,
          verified: !sessionChanged && previous.verified === true,
          migration_missing: false,
          check_error: sessionChanged ? 'session' : serviceMissing ? 'service' : 'unavailable'
        });
      }
    }).finally(() => {
      if (current() && pending === request) pending = null;
    });
    pending = request;
    return request;
  }

  return { check, reset };
}
