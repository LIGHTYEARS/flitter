function N40(T, R) {
  var a, e, t, r, h, i, c, s, A;
  if (R.indexOf("_") > -1) {
    if (R = R.replace(/(\d)_(?=\d)/g, "$1"), iJT.test(R)) return VM(T, R);
  } else if (R === "Infinity" || R === "NaN") {
    if (!+R) T.s = NaN;
    return T.e = NaN, T.d = null, T;
  }
  if (L40.test(R)) a = 16, R = R.toLowerCase();else if (C40.test(R)) a = 2;else if (M40.test(R)) a = 8;else throw Error(DA + R);
  if (r = R.search(/p/i), r > 0) c = +R.slice(r + 1), R = R.substring(2, r);else R = R.slice(2);
  if (r = R.indexOf("."), h = r >= 0, e = T.constructor, h) R = R.replace(".", ""), i = R.length, r = i - r, t = sJT(e, new e(a), r, r * 2);
  s = KM(R, a, bc), A = s.length - 1;
  for (r = A; s[r] === 0; --r) s.pop();
  if (r < 0) return new e(T.s * 0);
  if (T.e = YH(s, A), T.d = s, g9 = !1, h) T = c3(T, t, i * 4);
  if (c) T = T.times(Math.abs(c) < 54 ? Ka(2, c) : ZH.pow(2, c));
  return g9 = !0, T;
}