function oI0(T, R, a) {
  let e = T.treeAdapter.getNamespaceURI(a.element),
    {
      token: t
    } = a,
    r = T.treeAdapter.createElement(t.tagName, e, t.attrs);
  T._adoptNodes(R, r), T.treeAdapter.appendChild(R, r), T.activeFormattingElements.insertElementAfterBookmark(r, t), T.activeFormattingElements.removeEntry(a), T.openElements.remove(a.element), T.openElements.insertAfter(R, r, t.tagID);
}