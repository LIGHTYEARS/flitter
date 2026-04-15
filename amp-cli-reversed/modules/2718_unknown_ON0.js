async function ON0() {
  for (let T of KrT) {
    if (!T.mimeType) continue;
    try {
      let {
        stdout: R
      } = await Qm("xclip", ["-selection", "clipboard", "-t", T.mimeType, "-o"], {
        encoding: "buffer",
        maxBuffer: 52428800,
        timeout: 3000
      });
      if (R.length > 0) {
        let a = _W(T.extension);
        return await FTR(a, R), J.debug(`Successfully pasted image from clipboard (${T.extension})`, {
          tempFile: a
        }), a;
      }
    } catch (R) {
      J.debug(`Failed to paste ${T.extension} image with xclip`, {
        error: R
      });
    }
  }
  return null;
}