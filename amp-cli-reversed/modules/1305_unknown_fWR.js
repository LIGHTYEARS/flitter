function fWR(T, R) {
  let a = typeof T?.patchText === "string" ? T.patchText : void 0;
  if (!a) return null;
  try {
    let e = XS(a).hunks.map(t => WU(t.type === "update" && t.movePath ? t.movePath : t.path, void 0, R)).filter(t => t !== void 0);
    return gaT(e);
  } catch {
    return null;
  }
}