function CbR(T, R) {
  let a = T.slice(cmR, R),
    e = Qy(a, RG, RG + smR),
    t = e === omR;
  if (t || e === nmR) return EbR(a, t);
}
function LbR(T, R) {
  if (R > T.length) throw TypeError("Corrupt JPG, exceeded buffer limits");
}
function ILT(T, R) {
  if (R) return 8 * (1 + T.getBits(5));
  let a = T.getBits(2),
    e = [9, 13, 18, 30][a];
  return 1 + T.getBits(e);
}
function MbR(T, R, a, e) {
  if (R && a === 0) return 8 * (1 + T.getBits(5));
  if (a === 0) return ILT(T, !1);
  return Math.floor(e * [1, 1.2, 1.3333333333333333, 1.5, 1.7777777777777777, 1.25, 2][a - 1]);
}