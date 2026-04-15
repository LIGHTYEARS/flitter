async function tP0(T) {
  await EA(T, ["reset", "--hard", "HEAD"]), await EA(T, ["clean", "-fd", "-e", xXT]);
}
async function rP0(T) {
  let R = await Bw(T.repoRoot);
  if (R.length === 0) return;
  if (!(await T.promptForYesNo([`Local checkout has ${xF(R)}:`, eP0(R), "Clean them up before live sync starts?", "This will discard tracked changes and delete untracked files.", $tT].join(`
`)))) return;
  Hy(T.stdout, `Clearing local changes (${xF(R)})...`), await tP0(T.repoRoot);
  let a = await Bw(T.repoRoot);
  if (a.length > 0) throw new GR(["Couldn't fully clean the local checkout before live sync starts.", `Still found ${xF(a)}.`].join(" "), 1);
}