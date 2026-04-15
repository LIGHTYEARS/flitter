function eP0(T, R = Fy0) {
  let a = T.slice(0, R).map(t => `  ${aP0(t)}`),
    e = T.length - a.length;
  if (e > 0) a.push(`  ...and ${e} more ${o9(e, "file")}`);
  return a.join(`
`);
}
async function Bw(T) {
  let R = await EA(T, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
  return tVT(R.stdout).filter(a => a.path !== xXT).map(a => ({
    path: a.path,
    changeType: a.changeType,
    previousPath: a.previousPath
  }));
}