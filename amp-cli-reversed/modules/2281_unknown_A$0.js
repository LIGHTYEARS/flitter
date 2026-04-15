function l$0(T, R, a) {
  return _8(T, T.attempt(this.parser.constructs.document, R, a), "linePrefix", this.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4);
}
function Zk(T) {
  if (T === null || o3(T) || Qb(T)) return 1;
  if (HH(T)) return 2;
}
function WH(T, R, a) {
  let e = [],
    t = -1;
  while (++t < T.length) {
    let r = T[t].resolveAll;
    if (r && !e.includes(r)) R = r(R, a), e.push(r);
  }
  return R;
}
function A$0(T, R) {
  let a = -1,
    e,
    t,
    r,
    h,
    i,
    c,
    s,
    A;
  while (++a < T.length) if (T[a][0] === "enter" && T[a][1].type === "attentionSequence" && T[a][1]._close) {
    e = a;
    while (e--) if (T[e][0] === "exit" && T[e][1].type === "attentionSequence" && T[e][1]._open && R.sliceSerialize(T[e][1]).charCodeAt(0) === R.sliceSerialize(T[a][1]).charCodeAt(0)) {
      if ((T[e][1]._close || T[a][1]._open) && (T[a][1].end.offset - T[a][1].start.offset) % 3 && !((T[e][1].end.offset - T[e][1].start.offset + T[a][1].end.offset - T[a][1].start.offset) % 3)) continue;
      c = T[e][1].end.offset - T[e][1].start.offset > 1 && T[a][1].end.offset - T[a][1].start.offset > 1 ? 2 : 1;
      let l = {
          ...T[e][1].end
        },
        o = {
          ...T[a][1].start
        };
      if (wfT(l, -c), wfT(o, c), h = {
        type: c > 1 ? "strongSequence" : "emphasisSequence",
        start: l,
        end: {
          ...T[e][1].end
        }
      }, i = {
        type: c > 1 ? "strongSequence" : "emphasisSequence",
        start: {
          ...T[a][1].start
        },
        end: o
      }, r = {
        type: c > 1 ? "strongText" : "emphasisText",
        start: {
          ...T[e][1].end
        },
        end: {
          ...T[a][1].start
        }
      }, t = {
        type: c > 1 ? "strong" : "emphasis",
        start: {
          ...h.start
        },
        end: {
          ...i.end
        }
      }, T[e][1].end = {
        ...h.start
      }, T[a][1].start = {
        ...i.end
      }, s = [], T[e][1].end.offset - T[e][1].start.offset) s = ni(s, [["enter", T[e][1], R], ["exit", T[e][1], R]]);
      if (s = ni(s, [["enter", t, R], ["enter", h, R], ["exit", h, R], ["enter", r, R]]), s = ni(s, WH(R.parser.constructs.insideSpan.null, T.slice(e + 1, a), R)), s = ni(s, [["exit", r, R], ["enter", i, R], ["exit", i, R], ["exit", t, R]]), T[a][1].end.offset - T[a][1].start.offset) A = 2, s = ni(s, [["enter", T[a][1], R], ["exit", T[a][1], R]]);else A = 0;
      vh(T, e - 1, a - e + 3, s), a = e + s.length - A - 2;
      break;
    }
  }
  a = -1;
  while (++a < T.length) if (T[a][1].type === "attentionSequence") T[a][1].type = "data";
  return T;
}