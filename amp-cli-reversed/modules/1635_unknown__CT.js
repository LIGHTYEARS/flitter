async function _CT(T) {
  let R = Ai.join(bCT(T), "globalStorage", "storage.json");
  if (!(await wg(R))) return null;
  try {
    let a = await lk.promises.readFile(R, "utf-8"),
      e = JSON.parse(a).windowsState,
      t = Array.isArray(e?.openedWindows) ? e.openedWindows : [],
      r = t.length > 0 ? t : [e?.lastActiveWindow],
      h = new Set();
    for (let i of r) {
      if (!i) continue;
      let c = fAR(i);
      if (!c) continue;
      h.add(SD(c));
    }
    return h;
  } catch (a) {
    return J.debug(`Failed to parse ${T.ideName} windowsState`, {
      storageFilePath: R,
      error: a instanceof Error ? a.message : String(a)
    }), null;
  }
}