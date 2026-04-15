function F4(T, R, a, e, t, r) {
  let h = e === 1 ? "tableHeader" : e === 2 ? "tableDelimiter" : "tableData",
    i = "tableContent";
  if (a[0] !== 0) r.end = Object.assign({}, Wy(R.events, a[0])), T.add(a[0], 0, [["exit", r, R]]);
  let c = Wy(R.events, a[1]);
  if (r = {
    type: h,
    start: Object.assign({}, c),
    end: Object.assign({}, c)
  }, T.add(a[1], 0, [["enter", r, R]]), a[2] !== 0) {
    let s = Wy(R.events, a[2]),
      A = Wy(R.events, a[3]),
      l = {
        type: "tableContent",
        start: Object.assign({}, s),
        end: Object.assign({}, A)
      };
    if (T.add(a[2], 0, [["enter", l, R]]), e !== 2) {
      let o = R.events[a[2]],
        n = R.events[a[3]];
      if (o[1].end = Object.assign({}, n[1].end), o[1].type = "chunkText", o[1].contentType = "text", a[3] > a[2] + 1) {
        let p = a[2] + 1,
          _ = a[3] - a[2] - 1;
        T.add(p, _, []);
      }
    }
    T.add(a[3] + 1, 0, [["exit", l, R]]);
  }
  if (t !== void 0) r.end = Object.assign({}, Wy(R.events, t)), T.add(t, 0, [["exit", r, R]]), r = void 0;
  return r;
}