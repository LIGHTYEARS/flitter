function iI0(T, R, a) {
  let e = R,
    t = T.openElements.getCommonAncestor(R);
  for (let r = 0, h = t; h !== a; r++, h = t) {
    t = T.openElements.getCommonAncestor(h);
    let i = T.activeFormattingElements.getElementEntry(h),
      c = i && r >= eI0;
    if (!i || c) {
      if (c) T.activeFormattingElements.removeEntry(i);
      T.openElements.remove(h);
    } else {
      if (h = cI0(T, i), e === R) T.activeFormattingElements.bookmark = i;
      T.treeAdapter.detachNode(e), T.treeAdapter.appendChild(h, e), e = h;
    }
  }
  return e;
}