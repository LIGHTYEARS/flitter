function bWR(T, R) {
  let a;
  if (/(?<!&)\s*&\s*$/u.test(T.command)) a = {
    ...T,
    command: T.command.replace(/(?<!&)\s*&\s*$/u, "").trim()
  }, T = a;
  if (T.workdir?.startsWith("~")) {
    if (typeof process < "u") {
      let e = process.env.HOME || process.env.USERPROFILE;
      if (e) a = {
        ...T,
        workdir: T.workdir.replace(/^~/, e)
      }, T = a;
    }
  }
  if (a) return a;
  if (T.workdir) return;
  try {
    let [e, t] = HO(T.command),
      r = e && e.arguments.length === 1 && typeof e.arguments[0]?.value === "string" ? e.arguments[0].value : void 0;
    if (e?.program.value === "cd" && r && t) {
      let h = r;
      if (r.startsWith("~") && typeof process < "u") {
        let i = process.env.HOME || process.env.USERPROFILE;
        if (i) h = r.replace(/^~/, i);
      }
      return _WR(R.dir), {
        ...T,
        workdir: MR.resolvePath(R.dir, h).fsPath,
        command: T.command.slice(t.program.start.offset)
      };
    }
  } catch {
    return;
  }
  return;
}