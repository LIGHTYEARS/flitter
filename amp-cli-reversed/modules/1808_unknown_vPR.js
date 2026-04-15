function ylT(T) {
  let R = {};
  for (let a of Object.keys(T).sort()) R[a] = T[a];
  return R;
}
function PlT(T, R) {
  return {
    ...T,
    _ampSkillName: R._ampSkillName,
    _ampSkillNames: R._ampSkillNames,
    _ampSkillIncludeTools: R._ampSkillIncludeTools
  };
}
function yDT(T, R) {
  if (!T || T.length === 0) return [];
  let a = new Set(Object.keys(R ?? {}));
  return T.filter(e => !a.has(e));
}
function Hq(T) {
  if (T.hasNonSkillSource) return !1;
  if (!T.includeTools || T.includeTools.length === 0) return !1;
  return yDT(T.skillNames, T.includeToolsBySkill).length === 0;
}
function vPR(T) {
  let R = yDT(T.skillNames, T.includeToolsBySkill),
    a = T.includeToolsBySkill ? Object.entries(T.includeToolsBySkill).filter(([, t]) => t.some(r => Cj(T.toolName, r))).map(([t]) => t) : [],
    e = Array.from(new Set([...R, ...a]));
  return e.length > 0 ? e : void 0;
}