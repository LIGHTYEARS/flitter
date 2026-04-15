function GC0(T, R) {
  T.command("list").alias("ls").summary("List permissions").description("List user-configured permissions.").option("--json", "output as JSON").option("--builtin", "output only builtin permissions").option("-w, --workspace", "List workspace permissions instead of global").action(async (a, e) => {
    let t = await R(e),
      r = e.optsWithGlobals();
    await NC0({
      builtinOnly: r.builtin ?? !1,
      settings: t.settings,
      exit: process.exit.bind(process),
      json: r.json,
      stdout: process.stdout,
      scope: r.workspace ? "workspace" : "global"
    });
  });
}