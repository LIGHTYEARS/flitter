function mIR(T) {
  let R = Math.min(T, xIR);
  return Math.ceil(R / fIR);
}
function uIR(T) {
  let R = /@([^\s@]+)/g,
    a = [],
    e;
  while ((e = R.exec(T)) !== null) {
    let t = e[1]?.trim();
    if (t) a.push(t);
  }
  return a;
}
function yIR(T, R) {
  return T.map(a => {
    let e = a.startsWith("file:") ? Mr(a, R) : a;
    return "@" + OpR(e);
  });
}
function kAT(T, R) {
  let a = [];
  for (let e of T) {
    let t = e.trim();
    if (!t) continue;
    if (t.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(t)) {
      J.debug("Skipping absolute path from model", {
        path: t
      });
      continue;
    }
    for (let r of R) try {
      let h = d0(r.with({
        path: `${r.path}/${t}`
      }));
      a.push(h);
      break;
    } catch {}
  }
  return a;
}