async function SN0() {
  for (let T of KrT) {
    if (!T.mimeType) continue;
    try {
      let {
        stdout: R
      } = await Qm("wl-paste", ["--type", T.mimeType, "--no-newline"], {
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
      J.debug(`Failed to paste ${T.extension} image with wl-paste`, {
        error: R
      });
    }
  }
  return null;
}