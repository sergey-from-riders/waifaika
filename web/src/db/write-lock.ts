// Serialize local mutations with delivery across tabs. The promise fallback also
// protects repeated actions in older browsers without the Web Locks API.
let pending: Promise<unknown> = Promise.resolve();
export function withWriteLock<T>(action: () => Promise<T>): Promise<T> {
  const run = async (): Promise<T> =>
    navigator.locks?.request
      ? await navigator.locks.request("wifiyka-outbox-write", action)
      : await action();
  const next = pending.then(run, run);
  pending = next.catch(() => undefined);
  return next;
}
