function dAR(T) {
  let R = T.commandCandidates.unix;
  for (let a of R) if (jD(a, ["--version"], {
    encoding: "utf-8"
  }).status === 0) return a;
  return null;
}
function bCT(T) {
  let R = process.env[T.userDataEnv];
  if (R) return R;
  return Ai.join(CiT.homedir(), "Library", "Application Support", T.userDataDirName, "User");
}
function SD(T) {
  return Ai.resolve(T).replaceAll("\\", "/").toLowerCase();
}
function yE(T) {
  return {
    connection: "query",
    ideName: T.ideName,
    listConfigs: () => cAR(T),
    readWorkspaceState: R => sAR(T, R),
    openURI: R => oAR(T, R)
  };
}
async function wAR() {
  try {
    if (!(await jCT())) return [];
    let T = (await $CT()).filter(t => vCT(t.command));
    if (T.length === 0) return [];
    if (T.some(t => H0T(t.command) !== null)) return BAR(T);
    let R = await mL();
    if (!R) return [];
    let a = T[0].pid,
      e = await ICT(R);
    return FAR(e).map(t => ({
      ...t,
      pid: a
    }));
  } catch (T) {
    return J.debug("Failed to list Zed configs", {
      error: T instanceof Error ? T.message : String(T)
    }), [];
  }
}