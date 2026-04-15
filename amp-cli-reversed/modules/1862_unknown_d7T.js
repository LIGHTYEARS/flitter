function zq(T, R) {
  let a = T[Cr];
  return (a ? g_(a) : T)[R];
}
function exR(T, R, a) {
  let e = O7T(R, a);
  return e ? "value" in e ? e.value : e.get?.call(T.draft_) : void 0;
}
function O7T(T, R) {
  if (!(R in T)) return;
  let a = Nb(T);
  while (a) {
    let e = Object.getOwnPropertyDescriptor(a, R);
    if (e) return e;
    a = Nb(a);
  }
  return;
}
function BG(T) {
  if (!T.modified_) {
    if (T.modified_ = !0, T.parent_) BG(T.parent_);
  }
}
function Fq(T) {
  if (!T.copy_) T.copy_ = MG(T.base_, T.scope_.immer_.useStrictShallowCopy_);
}
function NG(T, R) {
  let a = zN(T) ? Bb("MapSet").proxyMap_(T, R) : FN(T) ? Bb("MapSet").proxySet_(T, R) : axR(T, R);
  return (R ? R.scope_ : S7T()).drafts_.push(a), a;
}
function txR(T) {
  if (!uk(T)) rc(10, T);
  return d7T(T);
}
function d7T(T) {
  if (!wb(T) || GN(T)) return T;
  let R = T[Cr],
    a;
  if (R) {
    if (!R.modified_) return R.base_;
    R.finalized_ = !0, a = MG(T, R.scope_.immer_.useStrictShallowCopy_);
  } else a = MG(T, !0);
  if (a7(a, (e, t) => {
    j7T(a, e, d7T(t));
  }), R) R.finalized_ = !1;
  return a;
}