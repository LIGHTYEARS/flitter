function jx0(T) {
  if (!Array.isArray(T) || T.length !== 2) return;
  let [R, a] = T;
  if (typeof R !== "number" || typeof a !== "number" || !Number.isInteger(R) || !Number.isInteger(a)) return;
  if (R < 1 || a === -1 || a < R) return;
  if (R === a) return `L${R}`;
  return `L${R}-${a}`;
}