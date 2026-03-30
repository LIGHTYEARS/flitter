// Request-level timeout utility (Gap #58)
//
// Wraps any async operation with a timeout. Prevents indefinite hangs
// on individual ACP operations when the agent is unresponsive.

/**
 * Wrap an async operation with a timeout.
 * Rejects with a descriptive error if the operation does not complete
 * within the specified duration.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(
        `${operationName} timed out after ${timeoutMs}ms -- agent may be hung`
      ));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}
