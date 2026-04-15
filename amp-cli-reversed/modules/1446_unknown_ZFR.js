function YFR(T, R) {
  let a = KFR(T, R),
    e = GFR(T, a);
  if (e === "" || e.startsWith("..") || zFR(e)) throw Error(`Artifact key resolves outside ${CO}: ${R}`);
  return a;
}
function EzT(T) {
  return (T.dir?.scheme === "file" ? T.dir.fsPath : void 0) ?? globalThis.process.cwd();
}
function QFR(T, R) {
  let a = dzT(R),
    e = EzT(T),
    t = FFR(e, CO);
  return YFR(t, a);
}
async function ZFR(T, R) {
  let a = dzT(R.key),
    e = R.dataType.trim();
  if (!e) throw Error("Artifact dataType must be non-empty");
  let t = typeof R.content === "string" ? Buffer.from(R.content, "utf8") : Buffer.from(R.content),
    r = QFR(T, a);
  return await HFR(qFR(r), {
    recursive: !0
  }), await WFR(r, t), T.dtwArtifactSyncService?.upsertArtifact({
    key: a,
    dataType: e,
    contentBase64: t.toString("base64")
  }, T.toolUseID), r;
}