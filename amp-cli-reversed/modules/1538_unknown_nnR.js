function nnR(T, R, a = "/", e = "/", t = !0) {
  function r(l, o) {
    return t ? l === o : l.toLowerCase() === o.toLowerCase();
  }
  if (a === "/") T = T.replaceAll(/\/{2,}/g, "/"), R = R.replaceAll(/\/{2,}/g, "/");else T = T.replaceAll(/\\{2,}/g, "\\"), R = R.replaceAll(/\\{2,}/g, "\\");
  if (T !== a && T.endsWith(a)) T = T.slice(0, -1);
  if (R !== a && R.endsWith(a)) R = R.slice(0, -1);
  if (r(T, R)) return "";
  if (!T.startsWith(a) && R.startsWith(a)) return R;
  let h = T === a ? [""] : T.split(a),
    i = R === a ? [""] : R.split(a),
    c = 0;
  while (c < h.length && c < i.length && r(h[c], i[c])) c++;
  let s = h.length - c,
    A = [];
  for (let l = 0; l < s; l++) A.push("..");
  return A.push(...i.slice(c)), A.join(e);
}