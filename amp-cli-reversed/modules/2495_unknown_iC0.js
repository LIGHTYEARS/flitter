function rC0(T) {
  if (T === "internal") return {
    colorMode: "vertical",
    colors: tC0
  };
  return {
    colorMode: "intensity"
  };
}
function hC0(T) {
  if (T instanceof Error && T.message) return T.message;
  if (typeof T === "string" && T) return T;
  return "unknown error";
}
function iC0(T, R) {
  if (!R) return T;
  let a = R.toLowerCase(),
    e = [];
  for (let t of T) {
    let r = cC0(t, a);
    if (r > 0) e.push({
      ...t,
      score: r
    });
  }
  return e.sort((t, r) => {
    let h = r.score - t.score;
    if (h !== 0) return h;
    return T.indexOf(t) - T.indexOf(r);
  }), e;
}