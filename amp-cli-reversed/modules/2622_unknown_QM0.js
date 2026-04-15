function XM0(T, R) {
  let a = BIT(T),
    e = BIT(R);
  if (!(a.length <= e.length && a.every((t, r) => t.dtwMessageID === e[r]?.dtwMessageID))) return;
  return e.slice(a.length);
}
function YM0(T, R, a) {
  let e = 0;
  for (let t of T) {
    let r = TW(t);
    if (r && R.has(r)) continue;
    if (e++, e === a) return e;
  }
  return e;
}
function BIT(T) {
  return T.messages.filter(R => R.role === "user");
}
function QM0(T, R, a) {
  if (a.length === 0) return [];
  let e = [...(T.queuedMessages ?? [])];
  return a.filter(t => {
    if (R.queuedMessageIDs.has(t.clientMessageID) || R.userMessageIDs.has(t.clientMessageID)) return !1;
    let r = e.findIndex(h => wET(t.content, h.queuedMessage.content));
    if (r >= 0) return e.splice(r, 1), !1;
    return !0;
  });
}