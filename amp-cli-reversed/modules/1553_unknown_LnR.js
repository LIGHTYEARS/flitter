async function LnR(T, R) {
  return new Promise((a, e) => {
    let t = T.subscribe({
      error: e,
      complete: () => a()
    });
    R?.addEventListener("abort", () => {
      t.unsubscribe(), e(new DOMException("Aborted", "AbortError"));
    }, {
      once: !0
    });
  });
}