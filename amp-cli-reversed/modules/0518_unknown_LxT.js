function LxT() {
  let T = null;
  try {
    if (process.stdout.isTTY) {
      let R = process.stdout.getWindowSize();
      T = [R[0], R[1]];
    }
  } catch {}
  return {
    isTTY: process.stdout.isTTY,
    columns: process.stdout.columns ?? null,
    rows: process.stdout.rows ?? null,
    windowSize: T,
    hasRefreshSize: typeof process.stdout._refreshSize === "function"
  };
}