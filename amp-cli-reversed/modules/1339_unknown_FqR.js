function JC(T, R) {
  return JSON.stringify(T) === JSON.stringify(R);
}
function HqR(T) {
  return Math.max(T.created, ...T.messages.map(R => R.role === "user" ? R.meta?.sentAt : void 0).filter(R => R !== void 0));
}
function WqR(T) {
  if (!T.meta || typeof T.meta !== "object") return !1;
  return T.meta.usesDtw === !0;
}
function qqR(T) {
  return T === "private" || T === "public_unlisted" || T === "public_discoverable" || T === "thread_workspace_shared";
}
function zqR(T) {
  let R = T,
    {
      creatorUserID: a
    } = R;
  return typeof a === "string" ? a : void 0;
}
function FqR(T) {
  if (!T.meta || typeof T.meta !== "object") return;
  let R = T.meta;
  if (!qqR(R.visibility)) return;
  return {
    visibility: R.visibility,
    sharedGroupIDs: Array.isArray(R.sharedGroupIDs) ? R.sharedGroupIDs.filter(a => typeof a === "string") : []
  };
}