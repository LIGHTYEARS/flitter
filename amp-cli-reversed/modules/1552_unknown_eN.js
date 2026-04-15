async function eN(T, R) {
  return new Promise((a, e) => {
    let t,
      r = !1,
      h,
      i = () => {
        h?.unsubscribe(), e(new DOMException("Aborted", "AbortError"));
      };
    R?.addEventListener("abort", i, {
      once: !0
    }), h = T.subscribe({
      next: c => {
        t = c, r = !0;
      },
      error: c => {
        R?.removeEventListener("abort", i), e(c);
      },
      complete: () => {
        if (R?.removeEventListener("abort", i), r) a(t);else e("Observable completed without emitting a value");
      }
    });
  });
}