function r2(T, R) {
  let a = T.get(R);
  if (!a) a = {
    id: R,
    label: R,
    attributes: []
  }, T.set(R, a);
  return a;
}
function b50(T) {
  let R = T.match(/^(\S+)\s+(\S+)(?:\s+(.+))?$/);
  if (!R) return null;
  let a = R[1],
    e = R[2],
    t = R[3]?.trim() ?? "",
    r = [],
    h,
    i = t.match(/"([^"]*)"/);
  if (i) h = i[1];
  let c = t.replace(/"[^"]*"/, "").trim();
  for (let s of c.split(/\s+/)) {
    let A = s.toUpperCase();
    if (A === "PK" || A === "FK" || A === "UK") r.push(A);
  }
  return {
    type: a,
    name: e,
    keys: r,
    comment: h
  };
}