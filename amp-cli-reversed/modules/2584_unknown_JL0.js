async function JL0(T) {
  await T.mcpService.initialized;
  let R = (await m0(T.toolService.getToolsForMode(T.mode))).find(e => e.spec.name === T.toolName);
  if (R === void 0) {
    T.stdout.write(`No such tool: ${T.toolName}
`), T.exit(1);
    return;
  }
  let a = R.spec;
  YL0(T)(a), T.exit(0);
}