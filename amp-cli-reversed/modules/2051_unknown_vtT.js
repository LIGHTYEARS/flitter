function vtT(T, R) {
  let a = yh.posix.normalize(R);
  if (a.length === 0 || a === "." || a.startsWith("../") || yh.isAbsolute(R)) throw new GR(`Refusing to sync path outside repository: ${R}`, 1);
  let e = yh.resolve(T, ...a.split("/")),
    t = yh.relative(T, e);
  if (t.startsWith("..") || yh.isAbsolute(t)) throw new GR(`Refusing to sync path outside repository: ${R}`, 1);
  return e;
}