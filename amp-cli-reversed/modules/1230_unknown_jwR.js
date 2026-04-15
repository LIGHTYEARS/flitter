function jwR({
  agentMode: T,
  model: R,
  provider: a
}) {
  if (T === L0T) return "aggman";
  if (qt(T)) return "free";
  if (T === "rush") return "rush";
  if (T === "deep") return "deep";
  if (JET(T)) return "internal";
  let e = dn(`${a}/${R}`);
  if (e) return $wR(e);
  return vwR(R, a);
}