function HM0(T) {
  return {
    id: T.clientMessageID,
    queuedMessage: $JT(T, -1)
  };
}
function WM0(T) {
  let R = new Set(),
    a = new Set(),
    e = new Map(),
    t = new Set();
  for (let r of T.messages) {
    let h = TW(r);
    if (h) {
      if (t.add(h), r.role === "user") R.add(h), e.set(h, r);
    }
  }
  for (let r of T.queuedMessages ?? []) {
    let h = RW(r);
    if (h) a.add(h);
  }
  return {
    userMessageIDs: R,
    queuedMessageIDs: a,
    userMessagesByID: e,
    messageIDsInTimeline: t
  };
}