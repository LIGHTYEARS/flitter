async function yD0(T) {
  try {
    return await cD0(T, "utf-8");
  } catch {
    return T;
  }
}
async function PD0(T, R) {
  return new Promise(a => {
    let e = !1,
      t = null,
      r = null,
      h = c => {
        if (e) return;
        if (e = !0, t) clearTimeout(t);
        r?.unsubscribe(), a(c);
      },
      i = !0;
    r = T.subscribe({
      next: () => {
        if (i) {
          i = !1;
          return;
        }
        h(!0);
      }
    }), t = setTimeout(() => {
      h(!1);
    }, R);
  });
}