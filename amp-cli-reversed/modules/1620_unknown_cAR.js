async function cAR(T) {
  try {
    if (!(await OAR())) return [];
    let R = await vAR(T);
    if (!R) return [];
    let a = await _CT(T);
    return (await pCT(T, a)).map(e => ({
      workspaceFolders: [e.workspaceFolder],
      port: 0,
      ideName: T.ideName,
      authToken: "",
      pid: R,
      connection: "query"
    }));
  } catch (R) {
    return J.debug(`Failed to list ${T.ideName} configs`, {
      error: R instanceof Error ? R.message : String(R)
    }), [];
  }
}