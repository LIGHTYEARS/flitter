function xi(T) {
  return Object.values(Ab).find(R => R.key === T);
}
function nk(T) {
  return xi(T)?.primaryModel ?? ya("CLAUDE_SONNET_4_5");
}
function TCT(T) {
  let R = xi(T);
  if (!R) return !1;
  return dn(R.primaryModel).capabilities?.vision ?? !1;
}
function qt(T) {
  return T === "free" || T.startsWith("free-");
}
function eAR(T, R) {
  return R.find(a => a.mode === T)?.description;
}
function RCT(T, R) {
  let a = (R.findIndex(e => e.mode === T) + 1) % R.length;
  return R[a]?.mode ?? "smart";
}
function O2(T) {
  return T["agent.deepReasoningEffort"] ?? "high";
}
function hCT(T) {
  let R = cCT.flatMap(a => {
    let e = T[a];
    return e === void 0 ? [] : [[a, e]];
  });
  return Object.fromEntries(R);
}
function iCT(T) {
  return sCT.includes(T);
}
function tAR(T) {
  let R = T["internal.model"];
  if (R && typeof R === "object") {
    let a = R.oracle?.trim();
    if (a && a.length > 0) {
      let e = a.indexOf(":");
      return e === -1 ? a : a.slice(e + 1).trim();
    }
  }
  return n8.GPT_5_4.name;
}