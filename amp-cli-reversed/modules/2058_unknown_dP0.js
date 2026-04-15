function dP0(T) {
  let R = T.threadTitle && T.threadTitle.trim().length > 0 ? T.threadTitle.trim() : T.threadId;
  if (!OH(T.output)) return [`Live sync: ${R}`, `${T.repoRoot}`, `(${T.threadId})`];
  let a = [`${oR.hex("#26d0cc").bold("Live sync")} ${oR.whiteBright(R)}`, oR.dim(T.threadId), oR.dim(T.repoRoot)];
  return SXT({
    output: T.output,
    textLines: a
  });
}