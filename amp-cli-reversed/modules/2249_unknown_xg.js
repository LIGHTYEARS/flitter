function ZO(T, R) {
  let a = T.fosterParentingEnabled;
  T.fosterParentingEnabled = !0, wH(T, R), T.fosterParentingEnabled = a;
}
function EYT(T, R) {
  T.pendingCharacterTokens.push(R);
}
function CYT(T, R) {
  T.pendingCharacterTokens.push(R), T.hasNonWhitespacePendingCharacterToken = !0;
}
function xg(T, R) {
  let a = 0;
  if (T.hasNonWhitespacePendingCharacterToken) for (; a < T.pendingCharacterTokens.length; a++) ZO(T, T.pendingCharacterTokens[a]);else for (; a < T.pendingCharacterTokens.length; a++) T._insertCharacters(T.pendingCharacterTokens[a]);
  T.insertionMode = T.originalInsertionMode, T._processToken(R);
}