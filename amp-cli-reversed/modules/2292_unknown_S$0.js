function S$0(T) {
  let R = T.length - 4,
    a = 3,
    e,
    t;
  if ((T[a][1].type === "lineEnding" || T[a][1].type === "space") && (T[R][1].type === "lineEnding" || T[R][1].type === "space")) {
    e = a;
    while (++e < R) if (T[e][1].type === "codeTextData") {
      T[a][1].type = "codeTextPadding", T[R][1].type = "codeTextPadding", a += 2, R -= 2;
      break;
    }
  }
  e = a - 1, R++;
  while (++e <= R) if (t === void 0) {
    if (e !== R && T[e][1].type !== "lineEnding") t = e;
  } else if (e === R || T[e][1].type === "lineEnding") {
    if (T[t][1].type = "codeTextData", e !== t + 2) T[t][1].end = T[e - 1][1].end, T.splice(t + 2, e - t - 2), R -= e - t - 2, e = t + 2;
    t = void 0;
  }
  return T;
}