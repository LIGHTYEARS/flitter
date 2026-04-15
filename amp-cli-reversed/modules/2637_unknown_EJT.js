async function EJT(T) {
  let R = (await T.configService.getLatest()).settings["experimental.agentMode"] ?? Ab.SMART.key,
    a = (await m0(T.toolService.getToolsForMode(R))).map(uD0).sort((e, t) => e.name.localeCompare(t.name));
  process.stdout.write(`${JSON.stringify({
    type: "tools",
    agentMode: R,
    count: a.length,
    tools: a
  }, null, 2)}
`);
}