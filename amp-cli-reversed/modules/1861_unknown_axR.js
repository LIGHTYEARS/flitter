function t7(T, R, a = !1) {
  if (!T.parent_ && T.immer_.autoFreeze_ && T.canAutoFreeze_) JA(R, a);
}
function axR(T, R) {
  let a = Array.isArray(T),
    e = {
      type_: a ? 1 : 0,
      scope_: R ? R.scope_ : S7T(),
      modified_: !1,
      finalized_: !1,
      assigned_: {},
      parent_: R,
      base_: T,
      draft_: null,
      copy_: null,
      revoke_: null,
      isManual_: !1
    },
    t = e,
    r = DL;
  if (a) t = [e], r = xy;
  let {
    revoke: h,
    proxy: i
  } = Proxy.revocable(t, r);
  return e.draft_ = i, e.revoke_ = h, i;
}