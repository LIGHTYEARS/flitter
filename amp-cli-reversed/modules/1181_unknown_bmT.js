function bmT(T, R, a, e, t, r, h) {
  let i;
  if (!h) i = {};else if (typeof h === "function") i = {
    callback: h
  };else i = h;
  if (typeof i.context > "u") i.context = 4;
  let c = i.context;
  if (i.newlineIsToken) throw Error("newlineIsToken may not be used with patch-generation functions, only with diffing functions");
  if (!i.callback) return s(Rw(a, e, i));else {
    let {
      callback: A
    } = i;
    Rw(a, e, Object.assign(Object.assign({}, i), {
      callback: l => {
        let o = s(l);
        A(o);
      }
    }));
  }
  function s(A) {
    if (!A) return;
    A.push({
      value: "",
      lines: []
    });
    function l(y) {
      return y.map(function (u) {
        return " " + u;
      });
    }
    let o = [],
      n = 0,
      p = 0,
      _ = [],
      m = 1,
      b = 1;
    for (let y = 0; y < A.length; y++) {
      let u = A[y],
        P = u.lines || c7R(u.value);
      if (u.lines = P, u.added || u.removed) {
        if (!n) {
          let k = A[y - 1];
          if (n = m, p = b, k) _ = c > 0 ? l(k.lines.slice(-c)) : [], n -= _.length, p -= _.length;
        }
        for (let k of P) _.push((u.added ? "+" : "-") + k);
        if (u.added) b += P.length;else m += P.length;
      } else {
        if (n) if (P.length <= c * 2 && y < A.length - 2) for (let k of l(P)) _.push(k);else {
          let k = Math.min(P.length, c);
          for (let f of l(P.slice(0, k))) _.push(f);
          let x = {
            oldStart: n,
            oldLines: m - n + k,
            newStart: p,
            newLines: b - p + k,
            lines: _
          };
          o.push(x), n = 0, p = 0, _ = [];
        }
        m += P.length, b += P.length;
      }
    }
    for (let y of o) for (let u = 0; u < y.lines.length; u++) if (y.lines[u].endsWith(`
`)) y.lines[u] = y.lines[u].slice(0, -1);else y.lines.splice(u + 1, 0, "\\ No newline at end of file"), u++;
    return {
      oldFileName: T,
      newFileName: R,
      oldHeader: t,
      newHeader: r,
      hunks: o
    };
  }
}