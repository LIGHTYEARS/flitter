// Module: child-process
// Original: GyR
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: util

// Module: GyR (CJS)
(T, R) => {
  var a = !1;
  function e(i, c) {
    return Object.assign(Error(`${c} ${i.command} ENOENT`), {
      code: "ENOENT",
      errno: "ENOENT",
      syscall: `${c} ${i.command}`,
      path: i.command,
      spawnargs: i.args,
    });
  }
  function t(i, c) {
    if (!a) return;
    let s = i.emit;
    i.emit = function (A, l) {
      if (A === "exit") {
        let o = r(l, c);
        if (o) return s.call(i, "error", o);
      }
      return s.apply(i, arguments);
    };
  }
  function r(i, c) {
    if (a && i === 1 && !c.file) return e(c.original, "spawn");
    return null;
  }
  function h(i, c) {
    if (a && i === 1 && !c.file) return e(c.original, "spawnSync");
    return null;
  }
  R.exports = {
    hookChildProcess: t,
    verifyENOENT: r,
    verifyENOENTSync: h,
    notFoundError: e,
  };
};
