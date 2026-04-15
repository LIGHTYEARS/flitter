function Ew0(T) {
  let R = Object.keys(T);
  for (let a = 0; a < R.length; a++) {
    let e = R[a];
    if (e !== ":@") return e;
  }
}
function Cw0(T, R, a, e) {
  if (R) {
    let t = Object.keys(R),
      r = t.length;
    for (let h = 0; h < r; h++) {
      let i = t[h];
      if (e.isArray(i, a + "." + i, !0, !0)) T[i] = [R[i]];else T[i] = R[i];
    }
  }
}