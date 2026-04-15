function LS0(T) {
  let R = /[!"&'),.:;<>?\]}]+$/.exec(T);
  if (!R) return [T, void 0];
  T = T.slice(0, R.index);
  let a = R[0],
    e = a.indexOf(")"),
    t = ZfT(T, "("),
    r = ZfT(T, ")");
  while (e !== -1 && t > r) T += a.slice(0, e + 1), a = a.slice(e + 1), e = a.indexOf(")"), r++;
  return [T, a];
}