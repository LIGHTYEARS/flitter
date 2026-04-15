function gv0(T, R) {
  let a = T.length,
    e,
    t,
    r;
  while (a--) if (T[a][0] === "enter") {
    if (T[a][1].type === "content") {
      e = a;
      break;
    }
    if (T[a][1].type === "paragraph") t = a;
  } else {
    if (T[a][1].type === "content") T.splice(a, 1);
    if (!r && T[a][1].type === "definition") r = a;
  }
  let h = {
    type: "setextHeading",
    start: {
      ...T[e][1].start
    },
    end: {
      ...T[T.length - 1][1].end
    }
  };
  if (T[t][1].type = "setextHeadingText", r) T.splice(t, 0, ["enter", h, R]), T.splice(r + 1, 0, ["exit", T[e][1], R]), T[e][1].end = {
    ...T[r][1].end
  };else T[e][1] = h;
  return T.push(["exit", h, R]), T;
}