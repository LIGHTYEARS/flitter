function dlT(T, R, a, e, t, r, h) {
  if (uk(t)) {
    let i = r && R && R.type_ !== 3 && !LG(R.assigned_, e) ? r.concat(e) : void 0,
      c = e7(T, t, i);
    if (j7T(a, e, c), uk(c)) T.canAutoFreeze_ = !1;else return;
  } else if (h) a.add(t);
  if (wb(t) && !GN(t)) {
    if (!T.immer_.autoFreeze_ && T.unfinalizedDrafts_ < 1) return;
    if (e7(T, t), (!R || !R.scope_.parent_) && typeof e !== "symbol" && Object.prototype.propertyIsEnumerable.call(a, e)) t7(T, t);
  }
}