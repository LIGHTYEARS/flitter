function WAR(T) {
  let R = T.match(OCT),
    a = R?.groups?.line;
  if (!a) return null;
  return {
    line: Number.parseInt(a, 10),
    column: R.groups?.column ? Number.parseInt(R.groups.column, 10) : void 0
  };
}