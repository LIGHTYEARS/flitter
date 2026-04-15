async function qL0(T) {
  await Promise.all([T.mcpService.initialized, T.toolboxService.initialized]);
  let R = await m0(T.mcpService.servers);
  for (let e of R) if (e.status.type === "failed") T.stderr.write(`error connecting to ${e.name}: ${e.status.error.message || "Unknown error"}
`);
  let a = await m0(T.toolService.getToolsForMode(T.mode));
  if (T.inspect) {
    await wL0(T, a);
    return;
  }
  LL0(T)(a), T.exit(0);
}