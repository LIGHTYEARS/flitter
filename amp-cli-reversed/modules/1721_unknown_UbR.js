function BbR(T) {
  let R = T.reduce((t, r) => t + r.length, 0),
    a = new Uint8Array(R),
    e = 0;
  for (let t of T) a.set(t, e), e += t.length;
  return a;
}
function WD(T) {
  let R = SLT.exec(T);
  if (!R) return;
  return Math.round(Number(R[1]) * (aG[R[2]] || 1));
}
function NbR(T) {
  let R = T.split(" ");
  return {
    height: WD(R[3]),
    width: WD(R[2])
  };
}
function UbR(T) {
  let R = T.match(H$.width),
    a = T.match(H$.height),
    e = T.match(H$.viewbox);
  return {
    height: a && WD(a[2]),
    viewbox: e && NbR(e[2]),
    width: R && WD(R[2])
  };
}