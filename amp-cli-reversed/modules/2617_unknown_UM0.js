function NM0(T, R) {
  if (R.length === 0) return T;
  let a = R.map(HM0);
  return {
    ...T,
    queuedMessages: [...(T.queuedMessages ?? []), ...a]
  };
}
function UM0(T, R) {
  if (R.size === 0 || !T.queuedMessages?.length) return T;
  let a = !1,
    e = T.queuedMessages.map(t => {
      let r = RW(t);
      if (!r || !R.has(r) || vrT(t)) return t;
      return a = !0, {
        ...t,
        interrupt: !0
      };
    });
  if (!a) return T;
  return {
    ...T,
    queuedMessages: e
  };
}