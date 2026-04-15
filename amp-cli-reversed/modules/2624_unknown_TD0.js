function JM0(T, R) {
  if (!R) return;
  return TD0(T, R) ? void 0 : R;
}
function TD0(T, R) {
  let a = z9.safeParse(R.targetMessageID);
  if (!a.success) return !1;
  let e = T.userMessagesByID.get(a.data);
  if (!e) return !1;
  if (!wET(e.content, R.content)) return !1;
  return R.truncatedMessageIDs.every(t => {
    let r = z9.safeParse(t);
    if (!r.success) return !0;
    return !T.messageIDsInTimeline.has(r.data);
  });
}