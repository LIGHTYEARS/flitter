async function m0(T, R) {
  return new Promise((a, e) => {
    let t,
      r = () => {
        t?.unsubscribe(), e(new DOMException("Aborted", "AbortError"));
      };
    R?.addEventListener("abort", r, {
      once: !0
    }), t = T.subscribe({
      next: h => {
        t?.unsubscribe(), R?.removeEventListener("abort", r), a(h);
      },
      error: h => {
        R?.removeEventListener("abort", r), e(h);
      },
      complete: () => {
        R?.removeEventListener("abort", r), e("Observable completed without emitting a value");
      }
    });
  });
}