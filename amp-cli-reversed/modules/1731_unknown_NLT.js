function NLT(T, R, a) {
  let e = T.length,
    t = R ? Math.max(0, R[0] - 1) : 0,
    r = R ? Math.min(e, R[1]) : Math.min(e, a),
    h = [];
  if (t > 0) h.push(`[... omitted ${t} ${o9(t, "entry", "entries")} ...]`);
  if (h.push(...T.slice(t, r)), r < e) h.push(`[... omitted ${e - r} more ...]`);
  return h.join(`
`);
}