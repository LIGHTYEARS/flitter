function RAR(T, R) {
  let a = xi(R);
  if (!a) return !1;
  return a.deferredTools?.includes(T) ?? !1;
}
function Kl(T, R, a) {
  let e = T?.["internal.visibleModes"] ?? [],
    t = T?.["experimental.modes"] ?? [],
    r = [...e, ...t],
    h = new Set(T?.disabledAgentModes ?? []);
  return Object.values(Ab).filter(i => {
    if (!nN(i.key, a?.userEmail)) return !1;
    if (i.key === L0T) return !1;
    if (r.includes(`!${i.key}`)) return !1;
    if (R === !1 && qt(i.key)) return !1;
    if (h.has(i.key)) return !1;
    if (a?.v2 && !("visibleInV2" in i && i.visibleInV2)) return !1;
    let c = "visible" in i ? i.visible : !1,
      s = r.includes(i.key);
    return c || s;
  }).map(i => ({
    mode: i.key,
    description: "description" in i ? i.description : void 0
  })).sort((i, c) => i.mode.localeCompare(c.mode));
}