function MST(T, R) {
  let a = a0(R),
    e = a.truthy ?? ["true", "1", "yes", "on", "y", "enabled"],
    t = a.falsy ?? ["false", "0", "no", "off", "n", "disabled"];
  if (a.case !== "sensitive") e = e.map(o => typeof o === "string" ? o.toLowerCase() : o), t = t.map(o => typeof o === "string" ? o.toLowerCase() : o);
  let r = new Set(e),
    h = new Set(t),
    i = T.Codec ?? T6,
    c = T.Boolean ?? JB,
    s = new (T.String ?? Rk)({
      type: "string",
      error: a.error
    }),
    A = new c({
      type: "boolean",
      error: a.error
    }),
    l = new i({
      type: "pipe",
      in: s,
      out: A,
      transform: (o, n) => {
        let p = o;
        if (a.case !== "sensitive") p = p.toLowerCase();
        if (r.has(p)) return !0;else if (h.has(p)) return !1;else return n.issues.push({
          code: "invalid_value",
          expected: "stringbool",
          values: [...r, ...h],
          input: n.value,
          inst: l,
          continue: !1
        }), {};
      },
      reverseTransform: (o, n) => {
        if (o === !0) return e[0] || "true";else return t[0] || "false";
      },
      error: a.error
    });
  return l;
}