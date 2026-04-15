function sgR(T) {
  if (!L8T.has(T)) throw TypeError(`Invalid referrerPolicy: ${T}`);
  return T;
}
function ogR(T) {
  if (/^(http|ws)s:$/.test(T.protocol)) return !0;
  let R = T.host.replace(/(^\[)|(]$)/g, ""),
    a = cgR(R);
  if (a === 4 && /^127\./.test(R)) return !0;
  if (a === 6 && /^(((0+:){7})|(::(0+:){0,6}))0*1$/.test(R)) return !0;
  if (T.host === "localhost" || T.host.endsWith(".localhost")) return !1;
  if (T.protocol === "file:") return !0;
  return !1;
}