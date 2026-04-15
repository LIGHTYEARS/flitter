function WER(T) {
  if (!T || typeof T !== "object") return !1;
  return !!(T.constructor && T.constructor.isBuffer && T.constructor.isBuffer(T));
}
function p_T(T, R) {
  if (yr(T)) {
    let a = [];
    for (let e = 0; e < T.length; e += 1) a.push(R(T[e]));
    return a;
  }
  return R(T);
}
function FER(T) {
  return typeof T === "string" || typeof T === "number" || typeof T === "boolean" || typeof T === "symbol" || typeof T === "bigint";
}
function _NT(T, R, a, e, t, r, h, i, c, s, A, l, o, n, p, _, m, b) {
  let y = T,
    u = b,
    P = 0,
    k = !1;
  while ((u = u.get(zL)) !== void 0 && !k) {
    let I = u.get(T);
    if (P += 1, typeof I < "u") if (I === P) throw RangeError("Cyclic object value");else k = !0;
    if (typeof u.get(zL) > "u") P = 0;
  }
  if (typeof s === "function") y = s(R, y);else if (y instanceof Date) y = o?.(y);else if (a === "comma" && yr(y)) y = p_T(y, function (I) {
    if (I instanceof Date) return o?.(I);
    return I;
  });
  if (y === null) {
    if (r) return c && !_ ? c(R, $a.encoder, m, "key", n) : R;
    y = "";
  }
  if (FER(y) || WER(y)) {
    if (c) {
      let I = _ ? R : c(R, $a.encoder, m, "key", n);
      return [p?.(I) + "=" + p?.(c(y, $a.encoder, m, "value", n))];
    }
    return [p?.(R) + "=" + p?.(String(y))];
  }
  let x = [];
  if (typeof y > "u") return x;
  let f;
  if (a === "comma" && yr(y)) {
    if (_ && c) y = p_T(y, c);
    f = [{
      value: y.length > 0 ? y.join(",") || null : void 0
    }];
  } else if (yr(s)) f = s;else {
    let I = Object.keys(y);
    f = A ? I.sort(A) : I;
  }
  let v = i ? String(R).replace(/\./g, "%2E") : String(R),
    g = e && yr(y) && y.length === 1 ? v + "[]" : v;
  if (t && yr(y) && y.length === 0) return g + "[]";
  for (let I = 0; I < f.length; ++I) {
    let S = f[I],
      O = typeof S === "object" && typeof S.value < "u" ? S.value : y[S];
    if (h && O === null) continue;
    let j = l && i ? S.replace(/\./g, "%2E") : S,
      d = yr(y) ? typeof a === "function" ? a(g, j) : g : g + (l ? "." + j : "[" + j + "]");
    b.set(T, P);
    let C = new WeakMap();
    C.set(zL, b), bNT(x, _NT(O, d, a, e, t, r, h, i, a === "comma" && _ && yr(y) ? null : c, s, A, l, o, n, p, _, m, C));
  }
  return x;
}