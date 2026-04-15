function gF(T) {
  return T === "in-progress" || T === "queued";
}
function Ux0(T, R) {
  let a = [];
  for (let e of FtT(T)) {
    let t = Vw(e);
    if (t) a.push(t);
  }
  if (a.length === 0) a.push({
    kind: "explore",
    title: R ? `Search codebase: ${R}` : "Search codebase"
  });
  return a;
}