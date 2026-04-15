function Zd0(T) {
  if (T >= 1048576) return `${(T / 1048576).toFixed(1)} MB`;else if (T >= 1024) return `${Math.round(T / 1024)} KB`;
  return `${T} bytes`;
}
function _IT(T) {
  try {
    let R = new URL(T).pathname.split("/").filter(Boolean);
    return R[R.length - 1] ?? T;
  } catch {
    return orT.basename(T);
  }
}
function bIT(T) {
  let R = T.match(Jd0),
    a = R?.groups?.line;
  if (!a) return null;
  return {
    line: Number.parseInt(a, 10),
    column: R.groups?.column ? Number.parseInt(R.groups.column, 10) : void 0
  };
}