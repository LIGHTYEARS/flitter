function VC0(T, R) {
  T.command("edit").summary("Edit permissions").description("Edit permissions interactively in your $EDITOR or from stdin.").option("-w, --workspace", "Edit workspace permissions instead of global").action(async (a, e) => {
    let t = await R(e);
    await MQT({
      settings: t.settings,
      stdin: process.stdin,
      stdout: process.stdout,
      stderr: process.stderr,
      exit: process.exit.bind(process),
      resolveEditor: eB,
      scope: a.workspace ? "workspace" : "global"
    });
  });
}