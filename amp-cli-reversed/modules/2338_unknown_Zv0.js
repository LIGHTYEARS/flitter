function ll(T) {
  return {
    line: T.line,
    column: T.column,
    offset: T.offset
  };
}
function eQT(T, R) {
  let a = -1;
  while (++a < R.length) {
    let e = R[a];
    if (Array.isArray(e)) eQT(T, e);else Zv0(T, e);
  }
}
function Zv0(T, R) {
  let a;
  for (a in R) if (aQT.call(R, a)) switch (a) {
    case "canContainEols":
      {
        let e = R[a];
        if (e) T[a].push(...e);
        break;
      }
    case "transforms":
      {
        let e = R[a];
        if (e) T[a].push(...e);
        break;
      }
    case "enter":
    case "exit":
      {
        let e = R[a];
        if (e) Object.assign(T[a], e);
        break;
      }
  }
}