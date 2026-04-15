async function HQ(T, R = 3) {
  for (let a = 1; a <= R; a++) try {
    let e = await fetch(T);
    if (!e.ok) throw Error(`HTTP ${e.status}: ${e.statusText} for ${T}`);
    return e;
  } catch (e) {
    let t = e instanceof Error ? e.message : String(e);
    if (e instanceof Error && e.message.match(/HTTP 4\d\d:/)) throw e;
    if (a === R) throw e;
    let r = 500 * 2 ** (a - 1);
    J.warn("fetchWithRetry", {
      url: T,
      attempt: a,
      maxRetries: R,
      message: t,
      retryingInMs: r
    }), await new Promise(h => setTimeout(h, r));
  }
  throw Error("Unexpected end of retry loop");
}