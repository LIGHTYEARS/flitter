function cx0(T) {
  if (ix0.has(T.key)) return !0;
  if (T.ctrlKey || T.altKey || T.metaKey) return !0;
  if (T.key.length === 1) {
    if (T.key.charCodeAt(0) < 32) return !0;
  }
  return !1;
}
function E1T(T, R, a = {}) {
  let e = a.padding ?? 1,
    t = T.findRenderObject();
  if (!t) return;
  let r = sx0(t);
  if (!r) return;
  let h = r.scrollController;
  if (!h) return;
  let i = ox0(t, R, r);
  if (!i) return;
  let c = r.size.height,
    s = h.offset,
    A = s;
  if (i.top < e) A = s + i.top - e;else if (i.bottom > c - e) A = s + (i.bottom - (c - e));else return;
  let l = h.maxScrollExtent;
  if (A = Math.max(0, Math.min(A, l)), A !== s) h.jumpTo(A);
}