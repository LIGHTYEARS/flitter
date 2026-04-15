function XC0(T, R) {
  T.command("add").summary("Add permission rule").description("Add a permission rule to the beginning of the list. Rules are evaluated in order, so newer rules take precedence.").argument("<action>", "Permission action: allow, reject, ask, or delegate").option("--to <program>", "Program to delegate decision to for delegate action").option("--context <type>", "Limit to specific context (thread or subagent)").option("-w, --workspace", "Add to workspace permissions instead of global").argument("<tool>", 'Tool name (supports globs like "mcp__playwright__*")').allowUnknownOption(!0).action(async (a, e, t, r) => {
    let h = await R(r);
    await BC0({
      args: r.parent?.args.slice(1) ?? [],
      settings: h.settings,
      stderr: process.stderr,
      exit: process.exit.bind(process),
      scope: t.workspace ? "workspace" : "global"
    });
  });
}