function lp0(T) {
  let R = T.split("\x00"),
    a = [];
  for (let e = 0; e + 1 < R.length; e += 2) {
    let t = R[e],
      r = R[e + 1] ?? "";
    if (!t) continue;
    a.push({
      hash: t,
      shortHash: t.slice(0, 12),
      subject: r
    });
  }
  return a;
}