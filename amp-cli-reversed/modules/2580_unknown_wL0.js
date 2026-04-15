function DL0(T) {
  if (!X9(T)) return !1;
  return T.features.some(R => R.name === dr.HARNESS_SYSTEM_PROMPT && R.enabled) || Ns(T.user.email);
}
async function wL0(T, R) {
  if (!DL0(T.serverStatus)) {
    T.stderr.write(`You are not allowed to do this.
`), T.exit(1);
    return;
  }
  let a = RO(nk(T.mode)),
    e = {
      id: Eh(),
      v: 0,
      created: Date.now(),
      messages: [],
      agentMode: T.mode,
      env: {
        initial: await T.getThreadEnvironment()
      }
    },
    {
      systemPrompt: t
    } = await LO({
      toolService: T.toolService,
      configService: T.configService,
      skillService: T.skillService,
      getThreadEnvironment: T.getThreadEnvironment,
      filesystem: T.fileSystem,
      threadService: T.threadService,
      serverStatus: T.serverStatus
    }, e, {
      enableTaskList: !0,
      enableTask: !0,
      enableOracle: !0,
      enableDiagnostics: !0
    }, {
      model: a.model,
      provider: a.provider,
      agentMode: T.mode
    }, new AbortController().signal),
    r = {
      agentMode: T.mode,
      systemPrompt: t.map(h => h.text).join(`

`),
      tools: R.map(ML0).sort((h, i) => h.name.localeCompare(i.name))
    };
  if (T.json) {
    T.stdout.write(T.isTTY ? JSON.stringify(r, null, 2) : JSON.stringify(r)), T.stdout.write(`
`), T.exit(0);
    return;
  }
  T.stdout.write(`# Agent Mode

${r.agentMode}

`), T.stdout.write(`# System Prompt

${r.systemPrompt}

`), T.stdout.write(`# Tools (${r.tools.length})

`);
  for (let h of r.tools) {
    T.stdout.write(`- ${h.name}: ${h.description ?? ""}
`);
    for (let i of h.arguments) T.stdout.write(`  - ${i.name}${i.required ? " (required)" : ""} [${i.type}] ${i.description ?? ""}
`);
  }
  T.exit(0);
}