function fg(T, R) {
  let a = 0;
  if (R.length < 1e4) T.push(...R);else while (a < R.length) T.push(...R.slice(a, a + 1e4)), a += 1e4;
}
function VYT(T) {
  let R = {},
    a = -1,
    e,
    t,
    r,
    h,
    i,
    c,
    s,
    A = new KYT(T);
  while (++a < A.length) {
    while (a in R) a = R[a];
    if (e = A.get(a), a && e[1].type === "chunkFlow" && A.get(a - 1)[1].type === "listItemPrefix") {
      if (c = e[1]._tokenizer.events, r = 0, r < c.length && c[r][1].type === "lineEndingBlank") r += 2;
      if (r < c.length && c[r][1].type === "content") while (++r < c.length) {
        if (c[r][1].type === "content") break;
        if (c[r][1].type === "chunkText") c[r][1]._isInFirstContentOfListItem = !0, r++;
      }
    }
    if (e[0] === "enter") {
      if (e[1].contentType) Object.assign(R, E$0(A, a)), a = R[a], s = !0;
    } else if (e[1]._container) {
      r = a, t = void 0;
      while (r--) if (h = A.get(r), h[1].type === "lineEnding" || h[1].type === "lineEndingBlank") {
        if (h[0] === "enter") {
          if (t) A.get(t)[1].type = "lineEndingBlank";
          h[1].type = "lineEnding", t = r;
        }
      } else if (h[1].type === "linePrefix" || h[1].type === "listItemIndent") ;else break;
      if (t) e[1].end = {
        ...A.get(t)[1].start
      }, i = A.slice(t, a), i.unshift(e), A.splice(t, a - t + 1, i);
    }
  }
  return vh(T, 0, Number.POSITIVE_INFINITY, A.slice(0)), !s;
}