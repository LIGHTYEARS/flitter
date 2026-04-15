function FAR(T) {
  let R = [];
  for (let a of T) {
    let e = gCT(a.paths);
    if (e.length === 0) continue;
    R.push({
      workspaceFolders: e,
      port: 0,
      ideName: "Zed",
      authToken: "",
      pid: 0,
      connection: "query",
      workspaceId: a.workspaceId
    });
  }
  return R;
}