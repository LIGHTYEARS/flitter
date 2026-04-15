async function dN0() {
  let T = await KTR();
  if (!T) return null;
  try {
    let R = await GrT(T);
    if (R.size > 0) return J.debug("Successfully pasted image from clipboard (png)", {
      tempFile: T,
      size: R.size
    }), T;
    J.debug("Skipping empty file for png");
  } catch (R) {
    J.debug("Failed to read pasted image file from PowerShell path", {
      error: R,
      pastedFilePath: T
    });
  }
  try {
    await zTR(T);
  } catch {}
  return null;
}