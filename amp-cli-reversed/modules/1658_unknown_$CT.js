function N0T(T) {
  return z0T.includes(T);
}
function YAR() {
  return process.env.TERM_PROGRAM?.toLowerCase() === "zed" || process.env.ZED_TERM === "true";
}
function U0T(T) {
  let R = Rn.basename(Rn.dirname(T)).match(/^\d+-(stable|preview|nightly|dev)$/)?.[1];
  return R && N0T(R) ? R : null;
}
async function $CT() {
  let T = await W0T("ps", ["-ax", "-o", "pid=", "-o", "comm="]);
  if (T.status !== 0) return [];
  return T.stdout.split(`
`).map(R => R.trim()).filter(Boolean).map(R => {
    let a = R.match(/^(\d+)\s+(.*)$/);
    if (!a) return null;
    return {
      pid: Number.parseInt(a[1] ?? "", 10),
      command: a[2] ?? ""
    };
  }).filter(R => R !== null && Number.isFinite(R.pid) && Boolean(R.command));
}