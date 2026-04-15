async function jN0() {
  for (let T of KrT) {
    if (!T.osascriptClass) continue;
    let R = _W(T.extension),
      a = `
			try
				set theImage to the clipboard as ${T.osascriptClass}
				set theFile to open for access POSIX file "${R}" with write permission
				write theImage to theFile
				close access theFile
				return "${R}"
			on error
				return ""
			end try
		`;
    try {
      let {
        stdout: e
      } = await Qm("osascript", ["-e", a]);
      if (e.trim() === R) try {
        let t = await GrT(R);
        if (t.size > 0) return J.debug(`Successfully pasted image from clipboard (${T.extension})`, {
          tempFile: R,
          size: t.size
        }), R;
        J.debug(`Skipping empty file for ${T.extension}`), await zTR(R);
      } catch {
        J.debug(`File not created for ${T.extension}`);
      }
    } catch (e) {
      J.debug(`Failed to paste ${T.extension} image with osascript`, {
        error: e
      });
    }
  }
  return null;
}