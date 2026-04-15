function M0(T, R) {
  return T.x === R.x && T.y === R.y;
}
function am(T, R) {
  if (T.x === R.x) return T.y < R.y ? w8 : G3;else if (T.y === R.y) return T.x < R.x ? Z8 : K3;else if (T.x < R.x) return T.y < R.y ? Rm : wA;else return T.y < R.y ? BA : sn;
}
function Lq0(T) {
  if (T === "LR") return [Z8, w8, w8, Z8];
  return [w8, Z8, Z8, w8];
}
function Mq0(T, R) {
  if (T.from === T.to) return Lq0(R);
  let a = am(T.from.gridCoord, T.to.gridCoord),
    e,
    t,
    r,
    h,
    i = R === "LR" ? M0(a, K3) || M0(a, sn) || M0(a, BA) : M0(a, G3) || M0(a, sn) || M0(a, wA);
  if (M0(a, Rm)) {
    if (R === "LR") e = w8, t = K3, r = Z8, h = G3;else e = Z8, t = G3, r = w8, h = K3;
  } else if (M0(a, wA)) {
    if (R === "LR") e = G3, t = K3, r = Z8, h = w8;else e = Z8, t = w8, r = G3, h = K3;
  } else if (M0(a, BA)) {
    if (R === "LR") e = w8, t = w8, r = K3, h = G3;else e = K3, t = G3, r = w8, h = Z8;
  } else if (M0(a, sn)) {
    if (R === "LR") e = w8, t = w8, r = K3, h = w8;else e = Z8, t = Z8, r = G3, h = Z8;
  } else if (i) {
    if (R === "LR" && M0(a, K3)) e = w8, t = w8, r = K3, h = Z8;else if (R === "TD" && M0(a, G3)) e = Z8, t = Z8, r = G3, h = w8;else e = a, t = hL(a), r = a, h = hL(a);
  } else e = a, t = hL(a), r = a, h = hL(a);
  return [e, t, r, h];
}