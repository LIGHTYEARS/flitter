function e7(T, R, a) {
  if (GN(R)) return R;
  let e = R[Cr];
  if (!e) return a7(R, (t, r) => dlT(T, e, R, t, r, a)), R;
  if (e.scope_ !== T) return R;
  if (!e.modified_) return t7(T, e.base_, !0), e.base_;
  if (!e.finalized_) {
    e.finalized_ = !0, e.scope_.unfinalizedDrafts_--;
    let t = e.copy_,
      r = t,
      h = !1;
    if (e.type_ === 3) r = new Set(t), t.clear(), h = !0;
    if (a7(r, (i, c) => dlT(T, e, t, i, c, a, h)), t7(T, t, !1), a && T.patches_) Bb("Patches").generatePatches_(e, a, T.patches_, T.inversePatches_);
  }
  return e.copy_;
}