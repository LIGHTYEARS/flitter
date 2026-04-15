function jzT(T) {
  if (T.length === 0) return UuT;
  let R = [];
  for (let a of T) {
    let e = a.trim().split(/\s+/);
    if (e[0] !== "git") {
      J.warn("generateDiffFilesCommands: expected git command, got", {
        cmd: a
      });
      continue;
    }
    R.push(e.slice(1));
  }
  return R.length > 0 ? R : UuT;
}