function rp0(T) {
  return T instanceof Error;
}
async function qP(T, R, a = {}) {
  try {
    let {
      stdout: e
    } = await JA0("git", R, {
      cwd: T,
      env: tp0(),
      maxBuffer: a.maxBufferBytes ?? Qx
    });
    return e;
  } catch (e) {
    if (a?.allowExitCodeOne && rp0(e) && (e.code === 1 || e.code === "1") && typeof e.stdout === "string") return e.stdout;
    throw e;
  }
}