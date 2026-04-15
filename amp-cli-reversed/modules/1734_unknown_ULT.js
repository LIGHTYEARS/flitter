async function ULT(T, R, a, e) {
  if (a = a.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (r, h) => {
    return process.env[h] || r;
  }), a = a.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (r, h) => {
    return process.env[h] || r;
  }), a.startsWith("~") && typeof process < "u" && process.env.HOME) a = kmR.join(process.env.HOME, a.slice(1));
  if (An(a)) return zR.file(a);
  for (let r of R) {
    let h = MR.joinPath(r, a);
    try {
      return await T.getMtime(h, {
        signal: e
      }), h;
    } catch {}
  }
  let t = R.at(0);
  if (t) return MR.joinPath(t, a);
  return zR.file(a);
}