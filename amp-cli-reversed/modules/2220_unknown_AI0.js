function AI0(T, R) {
  T._setDocumentType(R);
  let a = R.forceQuirks ? oi.QUIRKS : qf0(R);
  if (!Wf0(R)) T._err(R, vR.nonConformingDoctype);
  T.treeAdapter.setDocumentMode(T.document, a), T.insertionMode = YT.BEFORE_HTML;
}