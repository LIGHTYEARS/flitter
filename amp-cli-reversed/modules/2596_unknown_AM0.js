function AM0(T, R) {
  T.command("show").argument("<tool>", "The tool for which to show details").description("Show details about an active tool").option("--json", "output as a single JSON object").option("--mode <mode>", "filter tools by agent mode (default: smart)", "smart").action(async (a, e, t) => {
    let r = t.optsWithGlobals(),
      h = await R(t, r),
      i = 0,
      c = h.toolService;
    await JL0({
      toolName: a,
      json: r.json,
      isTTY: h.context.isTTY,
      mode: r.mode,
      toolService: c,
      mcpService: h.mcpService,
      stdout: process.stdout,
      exit: s => {
        i = s;
      }
    }), await h.asyncDispose(), h.cleanupTerminal(), process.exit(i);
  });
}