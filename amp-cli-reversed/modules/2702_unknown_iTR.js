function dw0(T, R) {
  return iTR(T, R);
}
function iTR(T, R, a) {
  let e,
    t = {};
  for (let r = 0; r < T.length; r++) {
    let h = T[r],
      i = Ew0(h),
      c = "";
    if (a === void 0) c = i;else c = a + "." + i;
    if (i === R.textNodeName) {
      if (e === void 0) e = h[i];else e += "" + h[i];
    } else if (i === void 0) continue;else if (h[i]) {
      let s = iTR(h[i], R, c),
        A = Lw0(s, R);
      if (h[YF] !== void 0) s[YF] = h[YF];
      if (h[":@"]) Cw0(s, h[":@"], c, R);else if (Object.keys(s).length === 1 && s[R.textNodeName] !== void 0 && !R.alwaysCreateTextNode) s = s[R.textNodeName];else if (Object.keys(s).length === 0) if (R.alwaysCreateTextNode) s[R.textNodeName] = "";else s = "";
      if (t[i] !== void 0 && t.hasOwnProperty(i)) {
        if (!Array.isArray(t[i])) t[i] = [t[i]];
        t[i].push(s);
      } else if (R.isArray(i, c, A)) t[i] = [s];else t[i] = s;
    }
  }
  if (typeof e === "string") {
    if (e.length > 0) t[R.textNodeName] = e;
  } else if (e !== void 0) t[R.textNodeName] = e;
  return t;
}