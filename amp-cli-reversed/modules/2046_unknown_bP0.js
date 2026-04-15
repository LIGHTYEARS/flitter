async function U4(T, R) {
  return T.catch(() => {}), await Promise.race([T, ...R]);
}
async function bP0(T) {
  if (T.checkoutMode === "never") return Hy(T.stderr, [`Staying on ${Ji(T.localHead)}.`, `Live sync will keep mirroring changed files, but untouched files may differ from ${Ji(T.remoteHead)}.`].join(" ")), T.localHead;
  let R = T.checkoutMode === "always";
  if (!R && T.checkoutMode === "prompt" && T.localWorktreeIsClean) R = !0, Hy(T.stdout, `Switching to ${Ji(T.remoteHead)} automatically because your checkout is clean.`);
  if (!R) R = await T.promptForYesNo([`Thread ${T.threadId} is on ${Ji(T.remoteHead)}`, `but local HEAD is ${Ji(T.localHead)}.`, `Switch to ${Ji(T.remoteHead)} before live sync starts? ${$tT}`].join(" "));
  if (!R) return Hy(T.stderr, [`Staying on ${Ji(T.localHead)}.`, "Live sync will keep mirroring changed files, but untouched files may differ from the thread commit."].join(" ")), T.localHead;
  if (!(await WxT(T.repoRoot, T.remoteHead))) {
    if (Hy(T.stdout, `Fetching ${Ji(T.remoteHead)} so your checkout can match the thread...`), await EA(T.repoRoot, ["fetch", "--all", "--quiet"]), !(await WxT(T.repoRoot, T.remoteHead))) throw new GR(`Commit ${T.remoteHead} is not available in this checkout after fetch.`, 1);
  }
  return Hy(T.stdout, `Switching to ${Ji(T.remoteHead)}...`), await EA(T.repoRoot, ["checkout", "--detach", T.remoteHead]), await IXT(T.repoRoot);
}