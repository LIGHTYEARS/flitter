function wUR() {
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