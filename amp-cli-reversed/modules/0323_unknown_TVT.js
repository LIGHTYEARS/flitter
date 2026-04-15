async function EA0(T, R) {
  try {
    let a = await T.getMtime(R);
    if (!Number.isFinite(a) || a < 0) return;
    return {
      mtimeMs: a
    };
  } catch {
    return;
  }
}
async function TVT(T, R) {
  try {
    let a = JKT(R, T.workspaceRoot),
      e = await T.fileSystem.readBinaryFile(zR.file(a));
    return {
      ok: !0,
      contentBase64: Buffer.from(e).toString("base64")
    };
  } catch (a) {
    return {
      ok: !1,
      error: RVT(a, "read_file")
    };
  }
}