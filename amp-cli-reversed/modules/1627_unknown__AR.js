function _AR(T) {
  if (!T) return null;
  try {
    let R = JSON.parse(T),
      a = R["editorpart.state"] ?? R.editorpart?.state,
      e = a?.activeGroup;
    if (typeof e !== "number") return null;
    let t = a?.serializedGrid,
      r = ACT(t?.root ?? t);
    return {
      activeGroup: e,
      leaves: r
    };
  } catch (R) {
    return J.debug("Failed to parse VS Code editor state", {
      error: R instanceof Error ? R.message : String(R)
    }), null;
  }
}