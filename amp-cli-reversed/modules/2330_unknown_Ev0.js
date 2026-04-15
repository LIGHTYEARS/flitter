function Ev0(T, R) {
  let a = 0;
  while (++a <= T.length) if ((a === T.length || T[a][1].type === "lineEnding") && T[a - 1][1].type === "data") {
    let e = T[a - 1][1],
      t = R.sliceStream(e),
      r = t.length,
      h = -1,
      i = 0,
      c;
    while (r--) {
      let s = t[r];
      if (typeof s === "string") {
        h = s.length;
        while (s.charCodeAt(h - 1) === 32) i++, h--;
        if (h) break;
        h = -1;
      } else if (s === -2) c = !0, i++;else if (s === -1) ;else {
        r++;
        break;
      }
    }
    if (R._contentTypeTextTrailing && a === T.length) i = 0;
    if (i) {
      let s = {
        type: a === T.length || c || i < 2 ? "lineSuffix" : "hardBreakTrailing",
        start: {
          _bufferIndex: r ? h : e.start._bufferIndex + h,
          _index: e.start._index + r,
          line: e.end.line,
          column: e.end.column - i,
          offset: e.end.offset - i
        },
        end: {
          ...e.end
        }
      };
      if (e.end = {
        ...s.start
      }, e.start.offset === e.end.offset) Object.assign(e, s);else T.splice(a, 0, ["enter", s, R], ["exit", s, R]), a += 2;
    }
    a++;
  }
  return T;
}