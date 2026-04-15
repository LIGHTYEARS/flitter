function zY(T, R) {
  T._appendCommentNode(R, T.openElements.currentTmplContentOrNode);
}
function nI0(T, R) {
  T._appendCommentNode(R, T.openElements.items[0]);
}
function lI0(T, R) {
  T._appendCommentNode(R, T.document);
}
function JtT(T, R) {
  if (T.stopped = !0, R.location) {
    let a = T.fragmentContext ? 0 : 2;
    for (let e = T.openElements.stackTop; e >= a; e--) T._setEndLocation(T.openElements.items[e], R);
    if (!T.fragmentContext && T.openElements.stackTop >= 0) {
      let e = T.openElements.items[0],
        t = T.treeAdapter.getNodeSourceCodeLocation(e);
      if (t && !t.endTag) {
        if (T._setEndLocation(e, R), T.openElements.stackTop >= 1) {
          let r = T.openElements.items[1],
            h = T.treeAdapter.getNodeSourceCodeLocation(r);
          if (h && !h.endTag) T._setEndLocation(r, R);
        }
      }
    }
  }
}