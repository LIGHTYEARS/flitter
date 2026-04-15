function cI0(T, R) {
  let a = T.treeAdapter.getNamespaceURI(R.element),
    e = T.treeAdapter.createElement(R.token.tagName, a, R.token.attrs);
  return T.openElements.replace(R.element, e), R.element = e, e;
}