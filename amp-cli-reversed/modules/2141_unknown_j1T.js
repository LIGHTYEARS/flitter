function j1T(T, R = 0) {
  let a = [];
  for (let e of T) {
    a.push({
      command: e,
      level: R
    });
    let t = e.subcommands;
    if (t !== void 0 && t.length > 0) a.push(...j1T(t, R + 1));
  }
  return a;
}