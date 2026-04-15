function mi(T) {
  if (!An(T)) throw Error(`Path must be absolute, not relative: ${T}`);
  return zR.file(T);
}
function I9T(T) {
  let R = qA(T),
    a = FdT(R).slice(1).toLowerCase();
  if (qLT.includes(a)) return !1;
  if (R === ".env.example" || R === ".env.sample") return !1;
  return /^\.env(\..*)?$/.test(R) || /^env\..+$/.test(R) || /\.(env|secret|credentials|envrc)$/i.test(R);
}