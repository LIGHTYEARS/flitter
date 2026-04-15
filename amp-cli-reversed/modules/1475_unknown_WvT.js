function k_(T) {
  return T === null || T === void 0;
}
function sL(T) {
  let R = T.startsWith("^") ? 1 : 0,
    a = T.endsWith("$") ? T.length - 1 : T.length;
  return T.slice(R, a);
}
function WvT(T, R) {
  let a = (T.toString().split(".")[1] || "").length,
    e = R.toString(),
    t = (e.split(".")[1] || "").length;
  if (t === 0 && /\d?e-\d?/.test(e)) {
    let c = e.match(/\d?e-(\d?)/);
    if (c?.[1]) t = Number.parseInt(c[1]);
  }
  let r = a > t ? a : t,
    h = Number.parseInt(T.toFixed(r).replace(".", "")),
    i = Number.parseInt(R.toFixed(r).replace(".", ""));
  return h % i / 10 ** r;
}