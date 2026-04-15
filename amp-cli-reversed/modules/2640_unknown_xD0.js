async function xD0(T, R, a) {
  return new Promise(e => {
    let t = !1,
      r = null,
      h = null,
      i = c => {
        if (t) return;
        if (t = !0, r) clearTimeout(r);
        h?.unsubscribe(), e(c);
      };
    h = T.subscribe({
      next: c => {
        if (c.currentThreadID === R) i(!0);
      }
    }), r = setTimeout(() => {
      i(!1);
    }, a);
  });
}