async function YkT(T) {
  try {
    return await _S.access(T), !0;
  } catch {
    return !1;
  }
}
async function f_0(T) {
  let R = qU(T) || T,
    a = T,
    e = 100;
  for (let r = 0; r < e; r++) {
    let h = Ih.join(a, ".amp", "settings.json"),
      i = Ih.join(a, ".amp", "settings.jsonc");
    if (await YkT(h)) return {
      workspaceRootPath: a,
      workspaceSettingsPath: h
    };
    if (await YkT(i)) return {
      workspaceRootPath: a,
      workspaceSettingsPath: i
    };
    if (a === R) break;
    a = Ih.dirname(a);
  }
  let t = Ih.join(R, ".amp", "settings.json");
  return {
    workspaceRootPath: R,
    workspaceSettingsPath: t
  };
}