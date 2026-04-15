function j5R(T) {
  let R = [];
  function a(e, t) {
    if (t === null || t === void 0) R.push(`${e}: ${String(t)}`);else if (typeof t === "boolean") R.push(`${e}: ${t ? "true" : "false"}`);else if (typeof t === "number" || typeof t === "string") R.push(`${e}: ${String(t)}`);else if (Array.isArray(t)) for (let r = 0; r < t.length; r++) a(`${e}_${r}`, t[r]);else if (typeof t === "object") for (let [r, h] of Object.entries(t)) a(`${e}_${r}`, h);else R.push(`${e}: ${String(t)}`);
  }
  for (let [e, t] of Object.entries(T)) a(e, t);
  return R.join(`
`) + `
`;
}