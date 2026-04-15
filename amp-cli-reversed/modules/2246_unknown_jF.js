function cg0(T, R) {
  T._err(R, vR.eofInElementThatCanContainOnlyText), T.openElements.pop(), T.insertionMode = T.originalInsertionMode, T.onEof(R);
}
function jF(T, R) {
  if (gYT.has(T.openElements.currentTagId)) switch (T.pendingCharacterTokens.length = 0, T.hasNonWhitespacePendingCharacterToken = !1, T.originalInsertionMode = T.insertionMode, T.insertionMode = YT.IN_TABLE_TEXT, R.type) {
    case u8.CHARACTER:
      {
        CYT(T, R);
        break;
      }
    case u8.WHITESPACE_CHARACTER:
      {
        EYT(T, R);
        break;
      }
  } else ZO(T, R);
}