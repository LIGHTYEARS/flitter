function g0T(T) {
  return T.startsWith("*** Add File:") || T.startsWith("*** Update File:") || T.startsWith("*** Delete File:") || T.trim() === "*** End Patch";
}
function clR(T, R) {
  let a = [],
    e = R;
  while (e < T.length) {
    let t = T[e];
    if (g0T(t)) break;
    if (t.startsWith("+")) a.push(t.slice(1));else if (t === "") a.push("");else throw Error(`Invalid patch format: Add File lines must start with '+', got: "${t.slice(0, 20)}${t.length > 20 ? "..." : ""}"`);
    e++;
  }
  return {
    content: a.join(`
`),
    nextIdx: e
  };
}