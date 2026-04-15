function F$0(T, R) {
  let a = T.length - 2,
    e = 3,
    t,
    r;
  if (T[e][1].type === "whitespace") e += 2;
  if (a - 2 > e && T[a][1].type === "whitespace") a -= 2;
  if (T[a][1].type === "atxHeadingSequence" && (e === a - 1 || a - 4 > e && T[a - 2][1].type === "whitespace")) a -= e + 1 === a ? 2 : 4;
  if (a > e) t = {
    type: "atxHeadingText",
    start: T[e][1].start,
    end: T[a][1].end
  }, r = {
    type: "chunkText",
    start: T[e][1].start,
    end: T[a][1].end,
    contentType: "text"
  }, vh(T, e, a - e + 1, [["enter", t, R], ["enter", r, R], ["exit", r, R], ["exit", t, R]]);
  return T;
}