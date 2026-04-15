function by(T, R) {
  let a = T.get(R);
  if (!a) a = {
    id: R,
    label: R,
    attributes: [],
    methods: []
  }, T.set(R, a);
  return a;
}
function WgT(T) {
  let R = T.trim().replace(/;$/, "");
  if (!R) return null;
  let a = "",
    e = R;
  if (/^[+\-#~]/.test(e)) a = e[0], e = e.slice(1).trim();
  let t = e.match(/^(.+?)\(([^)]*)\)(?:\s*(.+))?$/);
  if (t) {
    let A = t[1].trim(),
      l = t[3]?.trim(),
      o = A.endsWith("$") || e.includes("$"),
      n = A.endsWith("*") || e.includes("*");
    return {
      member: {
        visibility: a,
        name: A.replace(/[$*]$/, ""),
        type: l || void 0,
        isStatic: o,
        isAbstract: n
      },
      isMethod: !0
    };
  }
  let r = e.split(/\s+/),
    h,
    i;
  if (r.length >= 2) i = r[0], h = r.slice(1).join(" ");else h = r[0] ?? e;
  let c = h.endsWith("$"),
    s = h.endsWith("*");
  return {
    member: {
      visibility: a,
      name: h.replace(/[$*]$/, ""),
      type: i || void 0,
      isStatic: c,
      isAbstract: s
    },
    isMethod: !1
  };
}