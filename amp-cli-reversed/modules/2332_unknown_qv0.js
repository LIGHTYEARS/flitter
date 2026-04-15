function qv0(T, R) {
  let a = R.start._index,
    e = R.start._bufferIndex,
    t = R.end._index,
    r = R.end._bufferIndex,
    h;
  if (a === t) h = [T[a].slice(e, r)];else {
    if (h = T.slice(a, t), e > -1) {
      let i = h[0];
      if (typeof i === "string") h[0] = i.slice(e);else h.shift();
    }
    if (r > 0) h.push(T[t].slice(0, r));
  }
  return h;
}