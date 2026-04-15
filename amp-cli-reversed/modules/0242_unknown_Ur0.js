function Ur0(T, R) {
  if (T.length === 1) return R.length === 1 ? T < R ? -1 : 1 : -1;
  if (R.length === 1) return 1;
  if (T === _v || T === bv) return 1;else if (R === _v || R === bv) return -1;
  if (T === Pw) return 1;else if (R === Pw) return -1;
  return T.length === R.length ? T < R ? -1 : 1 : R.length - T.length;
}