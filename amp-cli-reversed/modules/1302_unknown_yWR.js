function gaT(T) {
  let R = Array.from(new Map(T.map(a => [a.toString(), a])).values());
  return R.length > 0 ? R : null;
}
function uWR(T, R) {
  let a = T?.path;
  if (typeof a !== "string") return null;
  let e = WU(a, void 0, R);
  return e ? [e] : null;
}
function yWR(T) {
  let R;
  try {
    R = W5T(HO(T));
  } catch {
    return [];
  }
  if (R.length !== 1) return [];
  let [a] = R;
  if (!a || a.program === xs || Array.isArray(a.program)) return [];
  if (a.program.toLowerCase() !== "sed") return [];
  let e = a.arguments;
  if (!e.every(t => typeof t === "string")) return [];
  if (!e.some(t => PWR(t))) return [];
  return kWR(e).filter(t => t !== "" && t !== "-");
}