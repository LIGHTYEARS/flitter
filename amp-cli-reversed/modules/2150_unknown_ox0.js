function sx0(T) {
  let R = T.parent;
  while (R) {
    if ("scrollController" in R && R.scrollController) return R;
    if (R = R.parent, R && !("size" in R)) break;
  }
  return null;
}
function ox0(T, R, a) {
  let {
      top: e,
      bottom: t
    } = R,
    r = T;
  while (r && r !== a) {
    let h = r.offset;
    if (e += h.y, t += h.y, r = r.parent, r && !("size" in r)) return null;
  }
  if (r !== a) return null;
  return {
    top: e,
    bottom: t
  };
}