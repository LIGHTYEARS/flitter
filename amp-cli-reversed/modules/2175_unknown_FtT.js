function FtT(T) {
  let R = LH("progress" in T ? T.progress : void 0);
  if (Array.isArray(R)) {
    let a = [];
    for (let e of R) {
      if (!ye(e)) continue;
      let t = e.tool_uses;
      if (!Array.isArray(t)) continue;
      a.push(...t);
    }
    return a;
  }
  if (ye(R) && Array.isArray(R.tool_uses)) return R.tool_uses;
  return [];
}