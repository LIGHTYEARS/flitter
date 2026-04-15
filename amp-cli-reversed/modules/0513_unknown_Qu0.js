function xtT() {
  if (B4) return B4;
  return B4 = Ku0(), B4;
}
function dxT(T) {
  let R = xtT().symbols.GetStdHandle(T);
  if (R === 0n || R === Nu0) throw Error(`GetStdHandle(${T}) returned an invalid handle`);
  return R;
}
function ExT(T, R) {
  let a = new Uint32Array(1);
  if (xtT().symbols.GetConsoleMode(T, RXT().ptr(a)) === 0) throw Error(`GetConsoleMode(${R}) failed`);
  return a[0] ?? 0;
}
function ug(T, R, a) {
  if (xtT().symbols.SetConsoleMode(T, R) === 0) throw Error(`SetConsoleMode(${a}) failed`);
}
function Vu0(T) {
  let R = T | zu0 | Hu0;
  return R &= ~(qu0 | Wu0 | Uu0), R;
}
function Xu0(T) {
  return T | Fu0;
}
function Yu0() {
  return null;
}
function Qu0() {
  let T = "1.3.10";
  if (!T) return !1;
  let R = T.split(".").map(Number),
    a = R[0] ?? 0,
    e = R[1] ?? 0,
    t = R[2] ?? 0;
  if (!Number.isFinite(a) || !Number.isFinite(e) || !Number.isFinite(t)) return !1;
  if (a !== 1 || e !== 2) return !1;
  return t < 22;
}