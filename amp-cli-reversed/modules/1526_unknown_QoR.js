function QoR(T, R) {
  if (!T.startsWith("#")) throw Error("External $ref is not supported, only local refs (#/...) are allowed");
  let a = T.slice(1).split("/").filter(Boolean);
  if (a.length === 0) return R.rootSchema;
  let e = R.version === "draft-2020-12" ? "$defs" : "definitions";
  if (a[0] === e) {
    let t = a[1];
    if (!t || !R.defs[t]) throw Error(`Reference not found: ${T}`);
    return R.defs[t];
  }
  throw Error(`Reference not found: ${T}`);
}