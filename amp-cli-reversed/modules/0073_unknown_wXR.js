function LXR() {
  return EXR.trace.getTracer(CXR);
}
async function DXR(T, R) {
  let a = [AM.join(T, "secrets.json"), AM.join(T, "history.jsonl"), AM.join(R, "settings.json")];
  await Promise.all(a.map(e => wXR(e)));
}
async function wXR(T) {
  try {
    let R = await hyT.stat(T);
    if ((R.mode & 63) !== 0) await hyT.chmod(T, MXR), J.info("Fixed insecure file permissions", {
      file: AM.basename(T),
      oldMode: `0o${(R.mode & 511).toString(8)}`,
      newMode: "0o600"
    });
  } catch (R) {
    if (R.code === "ENOENT") return;
    J.warn("Failed to check/fix file permissions", {
      file: T,
      error: R instanceof Error ? R.message : String(R)
    });
  }
}