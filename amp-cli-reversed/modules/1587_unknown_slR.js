function bET(T) {
  return T.startsWith("+") || T.startsWith("-") || T.startsWith(" ");
}
function slR(T, R) {
  let a = [],
    e = R;
  while (e < T.length) {
    let t = T[e];
    if (g0T(t)) break;
    if (t.trim() === "*** End of File") {
      e++;
      continue;
    }
    if (t.startsWith("@@") || bET(t)) {
      let {
        chunk: r,
        nextIdx: h
      } = olR(T, e);
      a.push(r), e = h;
      continue;
    }
    throw Error(`Invalid patch format: unexpected line in Update File: "${t.slice(0, 30)}..."`);
  }
  return {
    chunks: a,
    nextIdx: e
  };
}