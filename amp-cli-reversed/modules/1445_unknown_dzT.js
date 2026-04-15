function XFR(T) {
  return T.replaceAll("\\", "/").replace(/\/+/g, "/");
}
function dzT(T) {
  let R = T.trim();
  if (!R) throw Error("Artifact key must be non-empty");
  let a = XFR(R);
  if (a.startsWith("/")) throw Error(`Artifact key must be relative: ${T}`);
  let e = a.replace(/^\.\/+/, "");
  if (!e) throw Error("Artifact key must be non-empty");
  return e;
}