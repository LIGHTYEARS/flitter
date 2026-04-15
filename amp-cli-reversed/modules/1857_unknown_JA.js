function JA(T, R = !1) {
  if (GN(T) || uk(T) || !wb(T)) return T;
  if (qN(T) > 1) T.set = T.add = T.clear = T.delete = JkR;
  if (Object.freeze(T), R) Object.entries(T).forEach(([a, e]) => JA(e, !0));
  return T;
}