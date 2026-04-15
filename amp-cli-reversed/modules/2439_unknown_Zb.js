async function Zb(T, R) {
  let a = await eB();
  if (a === null) throw Error("No editor found, please set $AMP_EDITOR or $EDITOR");
  try {
    d9.instance.tuiInstance.suspend();
    let {
      command: e
    } = wQT(a);
    LQT(e, ud0(a, T, R), {
      stdio: "inherit"
    });
  } catch (e) {
    throw J.error("Failed to open file in editor", {
      editor: a,
      filePath: T,
      error: e
    }), Error(`Failed to open ${a}`);
  } finally {
    process.stdout.write("\x1B[?25l"), d9.instance.tuiInstance.resume(), d9.instance.tuiInstance.render();
  }
}