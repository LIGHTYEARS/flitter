function LK(T, R) {
  let a = {},
    e = H(T, ["name"]);
  if (e != null) Y(a, ["name"], e);
  let t = H(T, ["displayName"]);
  if (t != null) Y(a, ["displayName"], t);
  let r = H(T, ["description"]);
  if (r != null) Y(a, ["description"], r);
  let h = H(T, ["versionId"]);
  if (h != null) Y(a, ["version"], h);
  let i = H(T, ["deployedModels"]);
  if (i != null) {
    let o = i;
    if (Array.isArray(o)) o = o.map(n => {
      return QjR(n);
    });
    Y(a, ["endpoints"], o);
  }
  let c = H(T, ["labels"]);
  if (c != null) Y(a, ["labels"], c);
  let s = H(T, ["_self"]);
  if (s != null) Y(a, ["tunedModelInfo"], ROR(s));
  let A = H(T, ["defaultCheckpointId"]);
  if (A != null) Y(a, ["defaultCheckpointId"], A);
  let l = H(T, ["checkpoints"]);
  if (l != null) {
    let o = l;
    if (Array.isArray(o)) o = o.map(n => {
      return n;
    });
    Y(a, ["checkpoints"], o);
  }
  return a;
}