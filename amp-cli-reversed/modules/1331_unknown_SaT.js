function gqR(T) {
  return IqR.some(R => R.test(T));
}
function $qR(T) {
  let R = T.replace(/\\/g, "/");
  return R.includes("../") || R.includes("/..") || R.startsWith("..") || R === "..";
}
function SaT(T, R = "") {
  let a = [],
    e = xqR(T, {
      withFileTypes: !0
    });
  for (let t of e) {
    if (gqR(t.name)) continue;
    let r = hw(T, t.name),
      h = R ? hw(R, t.name) : t.name;
    if (kqR(r).isSymbolicLink()) {
      J.debug("Skipping symlink", {
        path: h
      });
      continue;
    }
    if ($qR(h)) throw new Ac(`Invalid path detected: ${h}`);
    if (t.isDirectory()) a.push(...SaT(r, h));else if (t.isFile()) {
      let i = fqR(r);
      a.push({
        path: h,
        fullPath: r,
        size: i.size
      });
    }
  }
  return a;
}