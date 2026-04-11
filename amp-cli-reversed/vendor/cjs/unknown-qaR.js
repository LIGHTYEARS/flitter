// Module: unknown-qaR
// Original: qaR
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: qaR (CJS)
(T, R) => {
  var a = qT("path"),
    e = v$T(),
    { fileURLToPath: t } = qT("url"),
    { MessageChannel: r } = qT("worker_threads"),
    {
      importHooks: h,
      specifiers: i,
      toHook: c,
      getExperimentalPatchInternals: s,
    } = WaR();
  function A(m) {
    (h.push(m), c.forEach(([b, y]) => m(b, y)));
  }
  function l(m) {
    let b = h.indexOf(m);
    if (b > -1) h.splice(b, 1);
  }
  function o(m, b, y, u) {
    let P = m(b, y, u);
    if (P && P !== b) b.default = P;
  }
  var n;
  function p() {
    let { port1: m, port2: b } = new r(),
      y = 0,
      u;
    ((n = (x) => {
      (y++, m.postMessage(x));
    }),
      m
        .on("message", () => {
          if ((y--, u && y <= 0)) u();
        })
        .unref());
    function P() {
      let x = setInterval(() => {}, 1000),
        f = new Promise((v) => {
          u = v;
        }).then(() => {
          clearInterval(x);
        });
      if (y === 0) u();
      return f;
    }
    let k = b;
    return {
      registerOptions: {
        data: { addHookMessagePort: k, include: [] },
        transferList: [k],
      },
      addHookMessagePort: k,
      waitForAllMessagesAcknowledged: P,
    };
  }
  function _(m, b, y) {
    if (this instanceof _ === !1) return new _(m, b, y);
    if (typeof m === "function") ((y = m), (m = null), (b = null));
    else if (typeof b === "function") ((y = b), (b = null));
    let u = b ? b.internals === !0 : !1;
    if (n && Array.isArray(m)) n(m);
    ((this._iitmHook = (P, k) => {
      let x = P,
        f = P.startsWith("node:"),
        v;
      if (f) P = P.replace(/^node:/, "");
      else {
        if (P.startsWith("file://"))
          try {
            P = t(P);
          } catch (I) {}
        let g = e(P);
        if (g) ((P = g.name), (v = g.basedir));
      }
      if (m) {
        for (let g of m)
          if (g === P) {
            if (v) {
              if (u) P = P + a.sep + a.relative(v, t(x));
              else if (!s() && !v.endsWith(i.get(x))) continue;
            }
            o(y, k, P, v);
          }
      } else o(y, k, P, v);
    }),
      A(this._iitmHook));
  }
  ((_.prototype.unhook = function () {
    l(this._iitmHook);
  }),
    (R.exports = _),
    (R.exports.Hook = _),
    (R.exports.addHook = A),
    (R.exports.removeHook = l),
    (R.exports.createAddHookMessageChannel = p));
};
