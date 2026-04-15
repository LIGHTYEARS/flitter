function MO0(T) {
  let R = (T || {}).singleTilde,
    a = {
      name: "strikethrough",
      tokenize: t,
      resolveAll: e
    };
  if (R === null || R === void 0) R = !0;
  return {
    text: {
      [126]: a
    },
    insideSpan: {
      null: [a]
    },
    attentionMarkers: {
      null: [126]
    }
  };
  function e(r, h) {
    let i = -1;
    while (++i < r.length) if (r[i][0] === "enter" && r[i][1].type === "strikethroughSequenceTemporary" && r[i][1]._close) {
      let c = i;
      while (c--) if (r[c][0] === "exit" && r[c][1].type === "strikethroughSequenceTemporary" && r[c][1]._open && r[i][1].end.offset - r[i][1].start.offset === r[c][1].end.offset - r[c][1].start.offset) {
        r[i][1].type = "strikethroughSequence", r[c][1].type = "strikethroughSequence";
        let s = {
            type: "strikethrough",
            start: Object.assign({}, r[c][1].start),
            end: Object.assign({}, r[i][1].end)
          },
          A = {
            type: "strikethroughText",
            start: Object.assign({}, r[c][1].end),
            end: Object.assign({}, r[i][1].start)
          },
          l = [["enter", s, h], ["enter", r[c][1], h], ["exit", r[c][1], h], ["enter", A, h]],
          o = h.parser.constructs.insideSpan.null;
        if (o) vh(l, l.length, 0, WH(o, r.slice(c + 1, i), h));
        vh(l, l.length, 0, [["exit", A, h], ["enter", r[i][1], h], ["exit", r[i][1], h], ["exit", s, h]]), vh(r, c - 1, i - c + 3, l), i = c + l.length - 2;
        break;
      }
    }
    i = -1;
    while (++i < r.length) if (r[i][1].type === "strikethroughSequenceTemporary") r[i][1].type = "data";
    return r;
  }
  function t(r, h, i) {
    let c = this.previous,
      s = this.events,
      A = 0;
    return l;
    function l(n) {
      if (c === 126 && s[s.length - 1][1].type !== "characterEscape") return i(n);
      return r.enter("strikethroughSequenceTemporary"), o(n);
    }
    function o(n) {
      let p = Zk(c);
      if (n === 126) {
        if (A > 1) return i(n);
        return r.consume(n), A++, o;
      }
      if (A < 2 && !R) return i(n);
      let _ = r.exit("strikethroughSequenceTemporary"),
        m = Zk(n);
      return _._open = !m || m === 2 && Boolean(p), _._close = !p || p === 2 && Boolean(m), h(n);
    }
  }
}