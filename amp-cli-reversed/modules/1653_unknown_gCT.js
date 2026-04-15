function gCT(T) {
  let R = T.trim();
  if (!R) return [];
  if (R.startsWith("[")) try {
    let a = JSON.parse(R);
    if (Array.isArray(a)) return a.filter(e => typeof e === "string");
  } catch (a) {
    J.debug("Failed to parse Zed workspace JSON paths", {
      error: a instanceof Error ? a.message : String(a)
    });
  }
  return R.split(/\n|\t/).filter(Boolean);
}