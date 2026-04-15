function wP(T, R) {
  return new Promise((a, e) => {
    if (R?.aborted) return e(R.reason);
    let t = setTimeout(a, T);
    R?.addEventListener("abort", () => {
      clearTimeout(t), e(R.reason);
    }, {
      once: !0
    });
  });
}