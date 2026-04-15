async function oIT(T, R) {
  let a = await eB();
  if (a === null) return Error("No editor found, please set $AMP_EDITOR or $EDITOR to edit permissions");
  let e = "";
  try {
    let t = {
      settings: T,
      stdin: process.stdin,
      stdout: process.stdout,
      stderr: {
        write: r => {
          return e = r.toString(), !0;
        }
      },
      exit: r => {
        if (r !== 0) throw J.error("editPermissions exited with status", r), Error(e);
      },
      resolveEditor: eB,
      scope: R
    };
    d9.instance.tuiInstance.suspend(), await MQT(t);
  } catch (t) {
    J.error("failed to open permissions editor:", t);
    let r = t instanceof Error ? `: ${t.message}` : "";
    return Error(`Failed to open ${a}${r}`);
  } finally {
    process.stdout.write("\x1B[?25l"), d9.instance.tuiInstance.resume(), d9.instance.tuiInstance.render();
  }
}