function nM0(T, R) {
  let a = T.command("tools").alias("tool").description("Tool management commands");
  return lM0(a, R), AM0(a, R), pM0(a, R), _M0(a, R), a;
}
function lM0(T, R) {
  T.command("list").alias("ls").description("List all active tools (including MCP tools)").option("--inspect", "Include full tool schemas and the effective system prompt").option("--json", "output as a single JSON array").option("--mode <mode>", "filter tools by agent mode (default: smart)", "smart").action(async (a, e) => {
    let t = e.optsWithGlobals(),
      r = await R(e, t),
      h = t.sp || t.systemPrompt;
    if (t.inspect && h) {
      let c = X9(r.serverStatus) ? r.serverStatus.features.some(l => l.name === dr.HARNESS_SYSTEM_PROMPT && l.enabled) : !1,
        s = X9(r.serverStatus) ? r.serverStatus.user.email : void 0;
      if (!c && !(s && Ns(s))) process.stderr.write(`You are not allowed to do this.
`), await r.asyncDispose(), r.cleanupTerminal(), process.exit(1);
      let A = await EL0(h, "utf-8").catch(() => h);
      Ms("systemPrompt", A);
    }
    let i = 0;
    await qL0({
      json: t.json,
      inspect: t.inspect,
      isTTY: r.context.isTTY,
      mode: t.mode,
      toolService: r.toolService,
      configService: r.configService,
      mcpService: r.mcpService,
      skillService: r.skillService,
      threadService: r.threadService,
      fileSystem: r.fileSystem,
      getThreadEnvironment: r.getThreadEnvironment,
      serverStatus: r.serverStatus,
      toolboxService: r.toolboxService,
      stderr: process.stderr,
      stdout: process.stdout,
      exit: c => {
        i = c;
      }
    }), await r.asyncDispose(), r.cleanupTerminal(), process.exit(i);
  });
}