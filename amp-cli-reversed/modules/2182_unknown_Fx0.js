function Fx0(T) {
  let R = 0;
  for (let t = 0; t < T.length; t++) {
    let r = T.charCodeAt(t);
    R = (R << 5) - R + r, R = R & R;
  }
  let a = [9, 10, 11, 12, 13, 14, 15, 208, 209, 210, 211, 212, 213, 214, 215],
    e = Math.abs(R) % a.length;
  return LT.index(a[e]);
}