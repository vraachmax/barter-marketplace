export const HOME_REQUEST_TIMEOUT_MS = 8000;

type JsonReader = <T>(path: string, init?: RequestInit) => Promise<T>;

/** One deadline per render, including the recommendation fallback. */
export function createHomeRequest(
  readJson: JsonReader,
  signal: AbortSignal = AbortSignal.timeout(HOME_REQUEST_TIMEOUT_MS),
) {
  return async function homeRequest<T>(path: string): Promise<T> {
    signal.throwIfAborted();
    try {
      return await readJson<T>(path, { signal });
    } catch (error) {
      // apiGetJson wraps network errors; retain the timeout for honest UI copy.
      if (signal.aborted) throw signal.reason;
      throw error;
    }
  };
}
