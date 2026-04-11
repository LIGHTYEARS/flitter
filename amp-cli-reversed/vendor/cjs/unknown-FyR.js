// Module: unknown-FyR
// Original: FyR
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: FyR (CJS)
(T, R) => {
  var a = qT("path"),
    e = UyR(),
    t = HyR(),
    r = zyR(),
    h = !1,
    i = /\.(?:com|exe)$/i,
    c = /node_modules[\\/].bin[\\/][^\\/]+\.cmd$/i;
  function s(o) {
    o.file = e(o);
    let n = o.file && r(o.file);
    if (n) return (o.args.unshift(o.file), (o.command = n), e(o));
    return o.file;
  }
  function A(o) {
    if (!h) return o;
    let n = s(o),
      p = !i.test(n);
    if (o.options.forceShell || p) {
      let _ = c.test(n);
      ((o.command = a.normalize(o.command)),
        (o.command = t.command(o.command)),
        (o.args = o.args.map((b) => t.argument(b, _))));
      let m = [o.command].concat(o.args).join(" ");
      ((o.args = ["/d", "/s", "/c", `"${m}"`]),
        (o.command = process.env.comspec || "cmd.exe"),
        (o.options.windowsVerbatimArguments = !0));
    }
    return o;
  }
  function l(o, n, p) {
    if (n && !Array.isArray(n)) ((p = n), (n = null));
    ((n = n ? n.slice(0) : []), (p = Object.assign({}, p)));
    let _ = {
      command: o,
      args: n,
      options: p,
      file: void 0,
      original: { command: o, args: n },
    };
    return p.shell ? _ : A(_);
  }
  R.exports = l;
};
