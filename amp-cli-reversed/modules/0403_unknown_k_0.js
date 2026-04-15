function k_0(T, R) {
  let {
    default: a,
    global: e,
    workspace: t
  } = R;
  if (!iCT(T)) return;
  let r = [];
  for (let i of [t, e, a]) if (Array.isArray(i)) r.push(...i);else if (i !== void 0) J.warn("Expected array value for merged array key", {
    key: T,
    value: i
  });
  let h = new Map();
  for (let i of r) {
    let c = JSON.stringify(i);
    if (!h.has(c)) h.set(c, i);
  }
  return h.size > 0 ? Array.from(h.values()) : void 0;
}