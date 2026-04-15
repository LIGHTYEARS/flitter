function mAR(T) {
  let R = T.mru[0] ?? T.preview ?? 0;
  return T.editors[R] ?? T.editors[0];
}
function uAR(T) {
  if (!T) return new Map();
  try {
    let R = JSON.parse(T).textEditorViewState ?? [];
    return new Map(R);
  } catch (R) {
    return J.debug("Failed to parse VS Code text editor state", {
      error: R instanceof Error ? R.message : String(R)
    }), new Map();
  }
}