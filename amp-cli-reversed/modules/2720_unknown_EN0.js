async function EN0() {
  let T = await KTR();
  if (!T) return null;
  try {
    if (!(await LQ("wslpath"))) return J.debug("wslpath command is not available; cannot read clipboard image from WSL"), null;
    let R = await vN0(T);
    if (!R) return null;
    let a = await GrT(R);
    if (a.size === 0) return J.debug("Skipping empty clipboard image file from Windows temp path", {
      windowsPath: T,
      wslPath: R
    }), null;
    let e = _W("png");
    return await uN0(R, e), J.debug("Successfully pasted image from Windows clipboard in WSL", {
      windowsPath: T,
      wslPath: R,
      linuxTempPath: e,
      size: a.size
    }), e;
  } catch (R) {
    return J.debug("Failed to paste clipboard image in WSL", {
      error: R,
      windowsPath: T
    }), null;
  } finally {
    await $N0(T);
  }
}