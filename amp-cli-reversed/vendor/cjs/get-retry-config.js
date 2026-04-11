// Module: get-retry-config
// Original: vIR
// Type: CJS (RT wrapper)
// Exports: getRetryConfig
// Category: util

// Module: vIR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.getRetryConfig = R));
  async function R(r) {
    let h = e(r);
    if (!r || !r.config || (!h && !r.config.retry)) return { shouldRetry: !1 };
    ((h = h || {}),
      (h.currentRetryAttempt = h.currentRetryAttempt || 0),
      (h.retry = h.retry === void 0 || h.retry === null ? 3 : h.retry),
      (h.httpMethodsToRetry = h.httpMethodsToRetry || [
        "GET",
        "HEAD",
        "PUT",
        "OPTIONS",
        "DELETE",
      ]),
      (h.noResponseRetries =
        h.noResponseRetries === void 0 || h.noResponseRetries === null
          ? 2
          : h.noResponseRetries),
      (h.retryDelayMultiplier = h.retryDelayMultiplier
        ? h.retryDelayMultiplier
        : 2),
      (h.timeOfFirstRequest = h.timeOfFirstRequest
        ? h.timeOfFirstRequest
        : Date.now()),
      (h.totalTimeout = h.totalTimeout
        ? h.totalTimeout
        : Number.MAX_SAFE_INTEGER),
      (h.maxRetryDelay = h.maxRetryDelay
        ? h.maxRetryDelay
        : Number.MAX_SAFE_INTEGER));
    let i = [
      [100, 199],
      [408, 408],
      [429, 429],
      [500, 599],
    ];
    if (
      ((h.statusCodesToRetry = h.statusCodesToRetry || i),
      (r.config.retryConfig = h),
      !(await (h.shouldRetry || a)(r)))
    )
      return { shouldRetry: !1, config: r.config };
    let c = t(h);
    r.config.retryConfig.currentRetryAttempt += 1;
    let s = h.retryBackoff
      ? h.retryBackoff(r, c)
      : new Promise((A) => {
          setTimeout(A, c);
        });
    if (h.onRetryAttempt) await h.onRetryAttempt(r);
    return (await s, { shouldRetry: !0, config: r.config });
  }
  function a(r) {
    let h = e(r);
    if (
      (r.config.signal?.aborted && r.code !== "TimeoutError") ||
      r.code === "AbortError"
    )
      return !1;
    if (!h || h.retry === 0) return !1;
    if (!r.response && (h.currentRetryAttempt || 0) >= h.noResponseRetries)
      return !1;
    if (
      !h.httpMethodsToRetry ||
      !h.httpMethodsToRetry.includes(r.config.method?.toUpperCase() || "GET")
    )
      return !1;
    if (r.response && r.response.status) {
      let i = !1;
      for (let [c, s] of h.statusCodesToRetry) {
        let A = r.response.status;
        if (A >= c && A <= s) {
          i = !0;
          break;
        }
      }
      if (!i) return !1;
    }
    if (
      ((h.currentRetryAttempt = h.currentRetryAttempt || 0),
      h.currentRetryAttempt >= h.retry)
    )
      return !1;
    return !0;
  }
  function e(r) {
    if (r && r.config && r.config.retryConfig) return r.config.retryConfig;
    return;
  }
  function t(r) {
    let h =
        (r.currentRetryAttempt ? 0 : (r.retryDelay ?? 100)) +
        ((Math.pow(r.retryDelayMultiplier, r.currentRetryAttempt) - 1) / 2) *
          1000,
      i = r.totalTimeout - (Date.now() - r.timeOfFirstRequest);
    return Math.min(h, i, r.maxRetryDelay);
  }
};
