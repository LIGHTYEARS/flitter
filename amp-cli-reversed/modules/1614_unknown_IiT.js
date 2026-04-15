function Xt(T) {
  let R = T.indexOf("/");
  if (R === -1) return T;
  return T.slice(R + 1);
}
function Ys(T) {
  let R = dn(T);
  return R.contextWindow - R.maxOutputTokens;
}
function QET(T) {
  return dn(T).maxOutputTokens;
}
function JET(T) {
  return T === C0T;
}
function qo(T) {
  return T === "deep" || T === C0T;
}
function nN(T, R) {
  if (!JET(T)) return !0;
  return Boolean(R && Ns(R));
}
function IiT(T, R) {
  let a = xi(R);
  if (!a) return !1;
  if (aCT.has(T)) {
    let e = a.finder ?? ZET.FINDER,
      t = eCT[e];
    if (T !== t) return !1;
  }
  if (a.includeTools) {
    if (a.deferredTools?.includes(T)) return !0;
    return a.includeTools.includes(T);
  }
  return !0;
}