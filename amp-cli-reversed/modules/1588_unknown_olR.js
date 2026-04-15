function olR(T, R) {
  let a = R,
    e = [],
    t = [],
    r = !1,
    h = [];
  while (a < T.length && T[a].startsWith("@@")) {
    let c = T[a].slice(2).trimStart();
    if (c) h.push(c);
    a++;
  }
  while (a < T.length) {
    let c = T[a];
    if (c.trim() === "*** End of File") {
      r = !0, a++;
      break;
    }
    if (c.startsWith("@@") || g0T(c)) break;
    if (!bET(c)) throw Error(`Invalid patch format: hunk lines must start with ' ', '-', or '+', got: "${c.slice(0, 20)}..."`);
    if (c.startsWith("-")) e.push(c.slice(1));else if (c.startsWith("+")) t.push(c.slice(1));else if (c.startsWith(" ")) e.push(c.slice(1)), t.push(c.slice(1));
    a++;
  }
  let i = h.length > 0 ? h.filter(Boolean).join(`
`) : void 0;
  return {
    chunk: {
      oldLines: e,
      newLines: t,
      changeContext: i,
      isEndOfFile: r
    },
    nextIdx: a
  };
}