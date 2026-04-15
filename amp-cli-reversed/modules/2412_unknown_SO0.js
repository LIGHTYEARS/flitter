function SO0(T, R) {
  let a = T.length,
    e;
  while (a--) if (T[a][1].type === "labelImage" && T[a][0] === "enter") {
    e = T[a][1];
    break;
  }
  T[a + 1][1].type = "data", T[a + 3][1].type = "gfmFootnoteCallLabelMarker";
  let t = {
      type: "gfmFootnoteCall",
      start: Object.assign({}, T[a + 3][1].start),
      end: Object.assign({}, T[T.length - 1][1].end)
    },
    r = {
      type: "gfmFootnoteCallMarker",
      start: Object.assign({}, T[a + 3][1].end),
      end: Object.assign({}, T[a + 3][1].end)
    };
  r.end.column++, r.end.offset++, r.end._bufferIndex++;
  let h = {
      type: "gfmFootnoteCallString",
      start: Object.assign({}, r.end),
      end: Object.assign({}, T[T.length - 1][1].start)
    },
    i = {
      type: "chunkString",
      contentType: "string",
      start: Object.assign({}, h.start),
      end: Object.assign({}, h.end)
    },
    c = [T[a + 1], T[a + 2], ["enter", t, R], T[a + 3], T[a + 4], ["enter", r, R], ["exit", r, R], ["enter", h, R], ["enter", i, R], ["exit", i, R], ["exit", h, R], T[T.length - 2], T[T.length - 1], ["exit", t, R]];
  return T.splice(a, T.length - a + 1, ...c), T;
}