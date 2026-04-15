function iv0(T, R) {
  let a = T.length,
    e = 0,
    t,
    r,
    h,
    i;
  while (a--) if (t = T[a][1], r) {
    if (t.type === "link" || t.type === "labelLink" && t._inactive) break;
    if (T[a][0] === "enter" && t.type === "labelLink") t._inactive = !0;
  } else if (h) {
    if (T[a][0] === "enter" && (t.type === "labelImage" || t.type === "labelLink") && !t._balanced) {
      if (r = a, t.type !== "labelLink") {
        e = 2;
        break;
      }
    }
  } else if (t.type === "labelEnd") h = a;
  let c = {
      type: T[r][1].type === "labelLink" ? "link" : "image",
      start: {
        ...T[r][1].start
      },
      end: {
        ...T[T.length - 1][1].end
      }
    },
    s = {
      type: "label",
      start: {
        ...T[r][1].start
      },
      end: {
        ...T[h][1].end
      }
    },
    A = {
      type: "labelText",
      start: {
        ...T[r + e + 2][1].end
      },
      end: {
        ...T[h - 2][1].start
      }
    };
  return i = [["enter", c, R], ["enter", s, R]], i = ni(i, T.slice(r + 1, r + e + 3)), i = ni(i, [["enter", A, R]]), i = ni(i, WH(R.parser.constructs.insideSpan.null, T.slice(r + e + 4, h - 3), R)), i = ni(i, [["exit", A, R], T[h - 2], T[h - 1], ["exit", s, R]]), i = ni(i, T.slice(h + 1)), i = ni(i, [["exit", c, R]]), vh(T, r, T.length, i), T;
}