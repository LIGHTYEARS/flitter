function o50(T) {
  let R = T.match(/^(\S+?)\s+(?:"([^"]*?)"\s+)?(<\|--|<\|\.\.|\*--|o--|-->|--\*|--o|--|>\s*|\.\.>|\.\.\|>|--)\s+(?:"([^"]*?)"\s+)?(\S+?)(?:\s*:\s*(.+))?$/);
  if (!R) return null;
  let a = R[1],
    e = R[2] || void 0,
    t = R[3].trim(),
    r = R[4] || void 0,
    h = R[5],
    i = R[6]?.trim() || void 0,
    c = n50(t);
  if (!c) return null;
  return {
    from: a,
    to: h,
    type: c.type,
    markerAt: c.markerAt,
    label: i,
    fromCardinality: e,
    toCardinality: r
  };
}