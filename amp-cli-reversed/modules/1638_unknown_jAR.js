function $AR(T) {
  let R = T.replaceAll("\\", "/").split("/").map(a => encodeURIComponent(a)).join("/");
  return `file:${R.startsWith("/") ? R : `/${R}`}?immutable=1`;
}
async function vAR(T) {
  return (await jAR()).find(R => SAR(T, R.command))?.pid ?? null;
}
async function jAR() {
  let T = await D0T("ps", ["-ax", "-o", "pid=", "-o", "command="]);
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