async function LQ(T) {
  try {
    return await Qm("which", [T]), !0;
  } catch {
    return !1;
  }
}
function _W(T) {
  let R = `amp-paste-${bN0(8).toString("hex")}.${T}`;
  return PN0(yN0(), R);
}
function xN0() {
  if (GTR() !== "linux") return !1;
  return Boolean(process.env.WSL_DISTRO_NAME) || mN0("/proc/sys/fs/binfmt_misc/WSLInterop");
}
function IN0(T) {
  return T.split(/\r?\n/u).map(R => R.trim()).filter(R => R.length > 0).at(-1) ?? null;
}
async function KTR() {
  try {
    let {
        stdout: T
      } = await Qm("powershell.exe", ["-NoProfile", "-STA", "-Command", fN0], {
        timeout: 3000
      }),
      R = IN0(T);
    if (!R) return J.debug("PowerShell did not return a file path for clipboard image"), null;
    return R;
  } catch (T) {
    return J.debug("Failed to paste image with PowerShell", {
      error: T
    }), null;
  }
}