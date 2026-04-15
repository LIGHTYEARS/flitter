function PbR(T) {
  if (typeof T !== "string") return !1;
  if (/[\s*"'\\]/.test(T) || T.includes("/") || T === "" || !/^[a-zA-Z0-9_*.-]+$/.test(T)) return !0;
  if (kbR(T)) return !0;
  return !1;
}
function kbR(T) {
  return /^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(T);
}
function Ll(T) {
  if (typeof T !== "string") return String(T);
  if (!PbR(T)) return T;
  return `'${T.replace(/'/g, "\\'")}'`;
}
function HD(T, R = "") {
  let a = [];
  for (let [e, t] of Object.entries(T)) {
    let r = R ? `${R}.${e}` : e;
    if (Array.isArray(t)) for (let h = 0; h < t.length; h++) {
      let i = `${r}.${h}`;
      if (typeof t[h] === "object" && t[h] !== null) a.push(...HD(t[h], i));else a.push({
        path: i,
        value: t[h]
      });
    } else if (typeof t === "object" && t !== null) a.push(...HD(t, r));else a.push({
      path: r,
      value: t
    });
  }
  return a;
}