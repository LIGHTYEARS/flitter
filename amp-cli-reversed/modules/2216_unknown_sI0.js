function sI0(T, R, a) {
  let e = T.treeAdapter.getTagName(R),
    t = DH(e);
  if (T._isElementCausesFosterParenting(t)) T._fosterParentElement(a);else {
    let r = T.treeAdapter.getNamespaceURI(R);
    if (t === sT.TEMPLATE && r === VR.HTML) R = T.treeAdapter.getTemplateContent(R);
    T.treeAdapter.appendChild(R, a);
  }
}