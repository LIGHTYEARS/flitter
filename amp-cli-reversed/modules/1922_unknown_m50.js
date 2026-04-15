function m50(T) {
  let R = T.match(/^(\S+)\s+([|o}{]+(?:--|\.\.)[|o}{]+)\s+(\S+)\s*:\s*(.+)$/);
  if (!R) return null;
  let a = R[1],
    e = R[2],
    t = R[3],
    r = R[4].trim(),
    h = e.match(/^([|o}{]+)(--|\.\.?)([|o}{]+)$/);
  if (!h) return null;
  let i = h[1],
    c = h[2],
    s = h[3],
    A = zgT(i),
    l = zgT(s),
    o = c === "--";
  if (!A || !l) return null;
  return {
    entity1: a,
    entity2: t,
    cardinality1: A,
    cardinality2: l,
    label: r,
    identifying: o
  };
}