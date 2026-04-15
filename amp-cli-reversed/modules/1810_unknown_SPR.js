function XE(T, R) {
  return JSON.stringify(T) === JSON.stringify(R);
}
function PDT(T, R) {
  let a = klT(T, "server"),
    e = klT(R, "tool"),
    t = `mcp__${a}__${e}`;
  if (t.length >= 64) return e.slice(0, 64);
  return t;
}
function klT(T, R) {
  return T.replace(/[\s-]+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "") || R;
}
function SPR({
  skillName: T,
  skillNames: R,
  hasNonSkillSource: a
}) {
  let e = Array.from(new Set([...(R ?? []), ...(T ? [T] : [])]));
  if (e.length === 0) return;
  return {
    skillNames: e,
    isFromMainConfig: a,
    deferred: !a
  };
}