function JDT(T) {
  return T.includes("*") || T.includes("?") || T.includes("[") || T.includes("{");
}
function qq(T) {
  let R = T.split("/"),
    a = [],
    e = [],
    t = !1;
  for (let r of R) if (t || JDT(r)) t = !0, e.push(r);else a.push(r);
  if (!t) {
    if (a.length === 0) return {
      basePart: null,
      patternPart: ""
    };
    let r = a.pop();
    return {
      basePart: a.length === 0 ? null : a.join("/"),
      patternPart: r
    };
  }
  return {
    basePart: a.length === 0 ? null : a.join("/"),
    patternPart: e.join("/")
  };
}