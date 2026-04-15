async function iXT(T, R) {
  let a = await hXT(T);
  if (a.kind !== "valid" || a.contents.pid !== R) return;
  await mY(T, {
    force: !0
  });
}
async function Sy0(T) {
  try {
    process.kill(T, "SIGTERM");
  } catch (R) {
    if (ItT(R, "ESRCH")) return;
    throw R;
  }
}
async function Oy0(T, R) {
  let a = Date.now() + Py0;
  while (Date.now() < a) {
    if (!R(T)) return !0;
    await Ey0(ky0);
  }
  return !R(T);
}
function dy0(T) {
  return ["Another amp live-sync is already running for this checkout.", "", ...[T.running.threadTitle, T.running.threadId, `PID ${T.running.pid}`].filter(R => Boolean(R)), "", "Kill the running live-sync process and continue? [y/N]: "].join(`
`);
}