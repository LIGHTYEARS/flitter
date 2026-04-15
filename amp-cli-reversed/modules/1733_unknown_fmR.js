function fmR(T, R, a, e) {
  let t = T[T.length - 1] === "" ? T.slice(0, -1) : T,
    r = {
      start: 0,
      end: Math.min(t.length, a)
    },
    h = R.read_range ? {
      start: Math.max(0, R.read_range[0] - 1),
      end: Math.min(t.length, R.read_range[1])
    } : r,
    i = t.slice(h.start, h.end).map(c => Mb.pruneWideLine(c, e)).map((c, s) => `${s + h.start + 1}: ${c}`);
  if (h.start > 0) i.unshift(`[... omitted lines 1 to ${h.start} ...]`);
  if (h.end < t.length) i.push(`[... omitted lines ${h.end + 1} to ${t.length} ...]`);
  return i.join(`
`);
}