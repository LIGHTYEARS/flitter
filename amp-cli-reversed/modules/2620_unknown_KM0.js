function qM0(T, R) {
  return T.messages.slice(R + 1).map(a => TW(a)).filter(a => a !== void 0);
}
function zM0(T, R) {
  return T.messages.some(a => a.role === "user" && TW(a) === R);
}
function FM0(T, R) {
  return (T.queuedMessages ?? []).some(a => RW(a) === R);
}
function vrT(T) {
  return "interrupt" in T && T.interrupt === !0;
}
function GM0(T, R, a, e) {
  return T.some(t => t.clientMessageID === e) || R.some(t => t.clientMessageID === e) || zM0(a, e) || FM0(a, e);
}
function KM0(T, R, a, e) {
  if (e.length === 0) return [];
  let {
    unmatchedPendingSubmits: t,
    acknowledgedByID: r
  } = VM0(e, a.userMessageIDs);
  if (t.length === 0) return [];
  let h = XM0(T, R);
  if (!h) return t;
  let i = YM0(h, r, t.length);
  return t.slice(i);
}