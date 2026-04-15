function XHT(T, {
  mtimeMs: R,
  size: a
}, e, t = {}) {
  let r;
  if (GHT(e)) [t, r] = [e, void 0];else r = e;
  let h = new YHT({
    path: T,
    size: a,
    lastModified: R
  });
  if (!r) r = h.name;
  return new Ek([h], r, {
    ...t,
    lastModified: h.lastModified
  });
}