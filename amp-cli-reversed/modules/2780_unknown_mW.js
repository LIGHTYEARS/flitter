function JU0(T) {
  return Array.from(new Set(T));
}
function qRR(T) {
  return JU0([...(T.skillNames ?? []), ...(T.skillName ? [T.skillName] : [])]);
}
function mW(T) {
  if (T.isExternal) return "external";
  switch (T.spec._target) {
    case "workspace":
      return "workspace";
    case "global":
      return "global";
    case "flag":
      return "flag";
    case "default":
      return "default";
  }
  return qRR(T).length > 0 ? "skill" : "other";
}