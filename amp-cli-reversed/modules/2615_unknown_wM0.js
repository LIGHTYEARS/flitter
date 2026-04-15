function MM0(T, ...R) {
  return R.reduce((a, e) => e ? e(a) : a, T);
}
function DM0(T, R, a, e) {
  return T.length > 0 || R.length > 0 || a.size > 0 || e !== void 0;
}
function wM0(T, R) {
  if (!R) return T;
  let a = BlR(T, R.targetMessageID);
  if (!a) return T;
  let {
      index: e,
      message: t
    } = a,
    r = T.messages.slice(0, e + 1);
  return r[e] = {
    ...t,
    content: R.content
  }, {
    ...T,
    messages: r,
    nextMessageId: MET({
      messages: r,
      nextMessageId: T.nextMessageId
    })
  };
}