function rAR(T, R) {
  let a = T["internal.model"];
  if (!a) return null;
  let e;
  if (typeof a === "string") e = a.trim();else e = a[R]?.trim();
  if (!e || e.length === 0) return null;
  let t = e.indexOf(":");
  if (t === -1) return null;
  let r = e.slice(0, t).trim(),
    h = e.slice(t + 1).trim();
  if (!r || !h) return null;
  return `${r}/${h}`;
}