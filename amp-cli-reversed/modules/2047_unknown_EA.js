async function mP0(T) {
  return (await EA(T, ["rev-parse", "--show-toplevel"])).stdout.trim();
}
async function uP0(T) {
  return yh.join(T, ".amp", "live-sync.pid");
}
function yP0(T) {
  return ["Another amp live-sync is already running for this checkout.", "", ...[T.runningThreadTitle, T.runningThreadId, `PID ${T.runningPID}`].filter(R => Boolean(R))].join(`
`);
}
async function IXT(T) {
  return (await EA(T, ["rev-parse", "HEAD"])).stdout.trim();
}
async function WxT(T, R) {
  try {
    return await EA(T, ["cat-file", "-e", `${R}^{commit}`]), !0;
  } catch {
    return !1;
  }
}
async function EA(T, R) {
  try {
    return {
      stdout: (await Uy0("git", R, {
        cwd: T,
        env: Ne.env
      })).stdout
    };
  } catch (a) {
    let e = a instanceof Error ? a.message : String(a);
    throw new GR(`git ${R.join(" ")} failed: ${e}`, 1);
  }
}