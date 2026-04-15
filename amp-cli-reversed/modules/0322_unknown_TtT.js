async function TtT(T, R) {
  try {
    let a = JKT(R, T.workspaceRoot),
      e = await T.fileSystem.readdir(zR.file(a));
    return {
      ok: !0,
      entries: await Promise.all(e.map(async t => {
        let r = t.isDirectory ? "directory" : "file",
          h = r === "file" ? await EA0(T.fileSystem, t.uri) : void 0;
        return [MR.basename(t.uri), r, h];
      }))
    };
  } catch (a) {
    return {
      ok: !1,
      error: RVT(a, "read_directory")
    };
  }
}