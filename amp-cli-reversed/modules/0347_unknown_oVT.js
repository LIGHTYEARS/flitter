function yp0(T) {
  if (T === "darwin") return "darwin";
  if (T === "win32") return "windows";
  return "linux";
}
async function Pp0(T) {
  let R = await T.getLatest();
  return hCT(R.settings);
}
function oVT(T) {
  let R = T.previouslyAdvertisedTools ?? [],
    {
      toolsToRegister: a,
      toolNamesToUnregister: e
    } = wA0(R, T.nextTools),
    t = T.forceRegisterAll ? [...T.nextTools] : a;
  for (let r of BA0(t)) T.logMessage?.("SEND", {
    type: "executor_tools_register",
    tools: r.map(h => h.name)
  }), T.transport.registerTools(r);
  for (let r of NA0(e)) T.logMessage?.("SEND", {
    type: "executor_tools_unregister",
    toolNames: r
  }), T.transport.unregisterTools(r);
  return [...T.nextTools];
}