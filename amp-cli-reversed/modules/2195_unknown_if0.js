function af0(T) {
  let R = [];
  for (let [a, e] of Object.entries(T)) R.push([a, e].join(": "));
  return R.join("; ");
}
function ef0(T) {
  let R = new Map();
  for (let a of T) R.set(a.toLowerCase(), a);
  return R;
}
function if0(T) {
  let R = String(T),
    a = [];
  return {
    toOffset: t,
    toPoint: e
  };
  function e(r) {
    if (typeof r === "number" && r > -1 && r <= R.length) {
      let h = 0;
      while (!0) {
        let i = a[h];
        if (i === void 0) {
          let c = bfT(R, a[h - 1]);
          i = c === -1 ? R.length + 1 : c + 1, a[h] = i;
        }
        if (i > r) return {
          line: h + 1,
          column: r - (h > 0 ? a[h - 1] : 0) + 1,
          offset: r
        };
        h++;
      }
    }
  }
  function t(r) {
    if (r && typeof r.line === "number" && typeof r.column === "number" && !Number.isNaN(r.line) && !Number.isNaN(r.column)) {
      while (a.length < r.line) {
        let i = a[a.length - 1],
          c = bfT(R, i),
          s = c === -1 ? R.length + 1 : c + 1;
        if (i === s) break;
        a.push(s);
      }
      let h = (r.line > 1 ? a[r.line - 2] : 0) + r.column - 1;
      if (h < a[r.line - 1]) return h;
    }
  }
}