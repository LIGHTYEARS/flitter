function EP0(T) {
  let R = OH(T.output) ? [T.runningThreadTitle ? oR.whiteBright(T.runningThreadTitle) : null, oR.dim(T.runningThreadId), oR.dim(`PID ${T.runningPID}`)].filter(a => a !== null) : [T.runningThreadTitle, T.runningThreadId, `PID ${T.runningPID}`].filter(a => Boolean(a));
  return ["Another amp live-sync is already running for this checkout.", "", ...SXT({
    output: T.output,
    textLines: R
  }), "", `Kill the running live-sync process and continue? ${$tT}`].join(`
`);
}