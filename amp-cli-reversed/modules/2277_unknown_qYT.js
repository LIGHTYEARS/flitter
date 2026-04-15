function t$0(T, R) {
  let a = -1,
    e = [];
  while (++a < R.length) (R[a].add === "after" ? T : e).push(R[a]);
  vh(T, 0, 0, e);
}
function qYT(T, R) {
  let a = Number.parseInt(T, R);
  if (a < 9 || a === 11 || a > 13 && a < 32 || a > 126 && a < 160 || a > 55295 && a < 57344 || a > 64975 && a < 65008 || (a & 65535) === 65535 || (a & 65535) === 65534 || a > 1114111) return "\uFFFD";
  return String.fromCodePoint(a);
}