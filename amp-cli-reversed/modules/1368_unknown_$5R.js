function $5R(T) {
  let R = T.trim().split(`
`).map(r => r.trim()).filter(r => r);
  if (R.length === 0) return null;
  let a = "",
    e = [],
    t = {};
  for (let r of R) {
    let h = r.indexOf(":");
    if (h === -1) continue;
    let i = r.substring(0, h).trim(),
      c = r.substring(h + 1).trim();
    if (!i || !c) continue;
    if (i === "name" && !a) a = c;else if (i === "description") e.push(c);else {
      let s = c.indexOf(" ");
      if (s === -1) t[i] = {
        type: "string",
        description: c,
        optional: !1
      };else {
        let A = c.substring(0, s),
          l = c.substring(s + 1).trim(),
          o = ["string", "boolean", "number", "integer", "array", "object"],
          n = A,
          p = l,
          _ = !1;
        if (n.endsWith("?")) _ = !0, n = n.slice(0, -1);
        if (o.includes(n.toLowerCase())) {
          if (/^(\()?optional(\))?(\s|$)/i.test(p)) _ = !0;
          t[i] = {
            type: n,
            description: p,
            optional: _
          };
        } else {
          if (/^(\()?optional(\))?(\s|$)/i.test(c)) _ = !0;
          t[i] = {
            type: "string",
            description: c,
            optional: _
          };
        }
      }
    }
  }
  if (!a) return null;
  return {
    name: a,
    description: e.join(`
`),
    parameters: t
  };
}