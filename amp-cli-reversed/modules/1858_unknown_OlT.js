function JkR() {
  rc(2);
}
function GN(T) {
  return Object.isFrozen(T);
}
function Bb(T) {
  let R = C7T[T];
  if (!R) rc(0, T);
  return R;
}
function S7T() {
  return Uj;
}
function TxR(T, R) {
  return {
    drafts_: [],
    parent_: T,
    immer_: R,
    canAutoFreeze_: !0,
    unfinalizedDrafts_: 0
  };
}
function jlT(T, R) {
  if (R) Bb("Patches"), T.patches_ = [], T.inversePatches_ = [], T.patchListener_ = R;
}
function DG(T) {
  wG(T), T.drafts_.forEach(RxR), T.drafts_ = null;
}
function wG(T) {
  if (T === Uj) Uj = T.parent_;
}
function SlT(T) {
  return Uj = TxR(Uj, T);
}
function RxR(T) {
  let R = T[Cr];
  if (R.type_ === 0 || R.type_ === 1) R.revoke_();else R.revoked_ = !0;
}
function OlT(T, R) {
  R.unfinalizedDrafts_ = R.drafts_.length;
  let a = R.drafts_[0];
  if (T !== void 0 && T !== a) {
    if (a[Cr].modified_) DG(R), rc(4);
    if (wb(T)) {
      if (T = e7(R, T), !R.parent_) t7(R, T);
    }
    if (R.patches_) Bb("Patches").generateReplacementPatches_(a[Cr].base_, T, R.patches_, R.inversePatches_);
  } else T = e7(R, a, []);
  if (DG(R), R.patches_) R.patchListener_(R.patches_, R.inversePatches_);
  return T !== R8T ? T : void 0;
}