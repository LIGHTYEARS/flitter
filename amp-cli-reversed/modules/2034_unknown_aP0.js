function aP0(T) {
  let R = T.changeType.replaceAll("_", " ");
  if ((T.changeType === "renamed" || T.changeType === "copied") && T.previousPath) return `${R}: ${T.previousPath} -> ${T.path}`;
  return `${R}: ${T.path}`;
}