function KC0(T, R) {
  T.command("test").summary("Test permissions").description("Test permissions against configured rules without running the tool.").argument("<tool-name>", "Name of the tool to test").option("-c, --context <context>", "Execution context (thread or subagent)").option("-t, --thread-id <id>", "Thread ID for evaluation").option("--json", "output as JSON").option("-q, --quiet", "suppress output, only use exit status").option("-w, --workspace", "Test against workspace permissions instead of global").allowUnknownOption(!0).action(async (a, e, t) => {
    let r = await R(t),
      h = () => !1;
    await zC0({
      toolName: a,
      context: e.context,
      threadId: e.threadId,
      json: e.json,
      settings: r.settings,
      remainingArgs: t.args,
      stdout: e.quiet ? {
        write: h
      } : process.stdout,
      stderr: process.stderr,
      exit: process.exit.bind(process),
      scope: e.workspace ? "workspace" : "global"
    });
  }).addHelpText("after", ["Example: ", "  # Test permissions of Amp trying to use bash", "  amp permissions test Bash --cmd ls", "  # ...when running in a subagent", "  amp permissions test --context subagent Bash --cmd ls", "", "See output of:", "", "  amp tools show", "", "for all tool schemas."].join(`
`));
}