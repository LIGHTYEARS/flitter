// Module: unknown-ByR
// Original: ByR
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: ByR (CJS)
(T, R) => {
  var a = process.env.OSTYPE === "cygwin" || process.env.OSTYPE === "msys",
    e = qT("path"),
    t = a ? ";" : ":",
    r = wyR(),
    h = (A) => Object.assign(Error(`not found: ${A}`), { code: "ENOENT" }),
    i = (A, l) => {
      let o = l.colon || t,
        n =
          A.match(/\//) || (a && A.match(/\\/))
            ? [""]
            : [
                ...(a ? [process.cwd()] : []),
                ...(l.path || process.env.PATH || "").split(o),
              ],
        p = a ? l.pathExt || process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM" : "",
        _ = a ? p.split(o) : [""];
      if (a) {
        if (A.indexOf(".") !== -1 && _[0] !== "") _.unshift("");
      }
      return { pathEnv: n, pathExt: _, pathExtExe: p };
    },
    c = (A, l, o) => {
      if (typeof l === "function") ((o = l), (l = {}));
      if (!l) l = {};
      let { pathEnv: n, pathExt: p, pathExtExe: _ } = i(A, l),
        m = [],
        b = (u) =>
          new Promise((P, k) => {
            if (u === n.length) return l.all && m.length ? P(m) : k(h(A));
            let x = n[u],
              f = /^".*"$/.test(x) ? x.slice(1, -1) : x,
              v = e.join(f, A),
              g = !f && /^\.[\\\/]/.test(A) ? A.slice(0, 2) + v : v;
            P(y(g, u, 0));
          }),
        y = (u, P, k) =>
          new Promise((x, f) => {
            if (k === p.length) return x(b(P + 1));
            let v = p[k];
            r(u + v, { pathExt: _ }, (g, I) => {
              if (!g && I)
                if (l.all) m.push(u + v);
                else return x(u + v);
              return x(y(u, P, k + 1));
            });
          });
      return o ? b(0).then((u) => o(null, u), o) : b(0);
    },
    s = (A, l) => {
      l = l || {};
      let { pathEnv: o, pathExt: n, pathExtExe: p } = i(A, l),
        _ = [];
      for (let m = 0; m < o.length; m++) {
        let b = o[m],
          y = /^".*"$/.test(b) ? b.slice(1, -1) : b,
          u = e.join(y, A),
          P = !y && /^\.[\\\/]/.test(A) ? A.slice(0, 2) + u : u;
        for (let k = 0; k < n.length; k++) {
          let x = P + n[k];
          try {
            if (r.sync(x, { pathExt: p }))
              if (l.all) _.push(x);
              else return x;
          } catch (f) {}
        }
      }
      if (l.all && _.length) return _;
      if (l.nothrow) return null;
      throw h(A);
    };
  ((R.exports = c), (c.sync = s));
};
