function vn0(T) {
  if (!T || typeof T !== "object") return null;
  let R = T,
    a = typeof R.message === "string" ? R.message : null,
    e = typeof R.note === "string" ? R.note : null,
    t = $KT(R.path);
  if (t && a && a !== "Invalid input") return `${t}: ${a}`;
  if (t && e) return `${t}: ${e}`;
  if (t && a) return `invalid value at ${t}`;
  return e ?? a;
}