function ZtT(T, R) {
  for (let a = 0; a < aI0; a++) {
    let e = rI0(T, R);
    if (!e) break;
    let t = hI0(T, e);
    if (!t) break;
    T.activeFormattingElements.bookmark = e;
    let r = iI0(T, t, e.element),
      h = T.openElements.getCommonAncestor(e.element);
    if (T.treeAdapter.detachNode(r), h) sI0(T, h, r);
    oI0(T, t, e);
  }
}