function mz(T) {
  let R = 0,
    a = !1,
    e = !1,
    t = -1;
  for (let r = 0; r < T.length; r++) {
    let h = T[r];
    if (e) {
      e = !1;
      continue;
    }
    if (h === "\\" && a) {
      e = !0;
      continue;
    }
    if (h === '"' && !e) {
      a = !a;
      continue;
    }
    if (a) continue;
    if (h === "{") {
      if (t === -1) t = r;
      R++;
    } else if (h === "}") {
      if (R--, R === 0 && t !== -1) return T.substring(t, r + 1);
    }
  }
  return null;
}