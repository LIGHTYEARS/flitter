function iM0(T, R, a) {
  try {
    let e = new TM0.default({
      allErrors: !0
    }).compile(R);
    if (e(T)) return null;
    let t = e.errors ?? [];
    if (t.length === 0) return `Invalid input for tool '${a}'`;
    let r = t.filter(s => s.keyword === "required"),
      h = t.filter(s => s.keyword === "type"),
      i = t.filter(s => !["required", "type"].includes(s.keyword)),
      c = [];
    if (r.length > 0) {
      let s = r.map(A => {
        let l = A.params?.missingProperty;
        return l ? `--${l}` : "unknown parameter";
      });
      c.push(`Missing required ${o9(s.length, "parameter")}: ${s.join(", ")}`);
    }
    for (let s of h) {
      let A = s.instancePath ? s.instancePath.replace(/^\//, "") : "unknown",
        l = A ? `--${A}` : "parameter",
        o = s.params?.type ?? "unknown";
      c.push(`Parameter ${l} must be of type ${o}`);
    }
    for (let s of i) {
      let A = s.instancePath ? s.instancePath.replace(/^\//, "") : "unknown",
        l = A ? `--${A}` : "parameter";
      c.push(`Parameter ${l}: ${s.message}`);
    }
    if (R.properties && Object.keys(R.properties).length > 0) c.push(`
Available parameters:`), c.push(hM0(R));
    return c.join(`
`);
  } catch (e) {
    return `Failed to validate input for tool '${a}': ${e instanceof Error ? e.message : "Unknown validation error"}`;
  }
}