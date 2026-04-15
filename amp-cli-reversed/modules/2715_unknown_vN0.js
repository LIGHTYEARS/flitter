async function vN0(T) {
  try {
    let {
        stdout: R
      } = await Qm("wslpath", ["-u", T], {
        timeout: 3000
      }),
      a = R.trim();
    return a.length > 0 ? a : null;
  } catch (R) {
    return J.debug("Failed to convert Windows clipboard path to WSL path", {
      error: R,
      windowsPath: T
    }), null;
  }
}