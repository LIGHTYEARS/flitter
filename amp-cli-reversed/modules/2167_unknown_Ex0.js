function Sx0(T) {
  let R = T.path?.trim(),
    a = T.pattern?.trim();
  if (R && a) return `Grep ${R} "${a}"`;
  if (a) return `Grep "${a}"`;
  if (R) return `Grep ${R}`;
  return "Grep";
}
function ai(T) {
  for (let R of ["path", "filePattern", "pattern", "query", "url", "objective", "description", "prompt"]) if (typeof T[R] === "string" && T[R].trim()) return T[R].trim();
  return;
}
function Ox0(T) {
  let R = T?.split(`
`)[0]?.trim();
  if (!R) return "Consulted oracle";
  return `Consulted oracle: ${R}`;
}
function dx0(T) {
  let R = T?.split(`
`)[0]?.trim();
  if (!R) return "Consulted librarian";
  return `Consulted librarian: ${R}`;
}
function hfT(T) {
  if (T.status !== "done" || typeof T.result !== "string") return;
  return T.result.trim() || void 0;
}
function D1T(T) {
  if (typeof T.url !== "string") return;
  return T.url.trim() || void 0;
}
function w1T(T) {
  let R = typeof T.query === "string" ? T.query : void 0,
    a = typeof T.objective === "string" ? T.objective : void 0;
  return (R ?? a)?.trim() || void 0;
}
function Ex0(T) {
  if (!ye(T)) return;
  let R = typeof T.normalized_name === "string" ? T.normalized_name : typeof T.tool_name === "string" ? T.tool_name : void 0;
  if (!R) return;
  let a = ye(T.input) ? T.input : {};
  if (R === "eval_git_diff") {
    let e = typeof a.command === "string" ? a.command.trim() : void 0;
    return {
      kind: "explore",
      title: e ? `Evaluated ${e}` : "Evaluated git diff"
    };
  }
  if (R === "post_explanation") {
    let e = typeof a.file === "string" ? a.file.trim() : void 0,
      t = Mx0(a),
      r = t[0],
      h = r ? Lx0(r.startLine, r.endLine) : void 0,
      i = r?.file ?? e,
      c = t.length > 1 ? ` (+${t.length - 1} more)` : "";
    if (i && h) return {
      kind: "explore",
      title: `Explained ${i} L${h}${c}`
    };
    if (i) return {
      kind: "explore",
      title: `Explained ${i}`
    };
    if (h) return {
      kind: "explore",
      title: `Explained L${h}${c}`
    };
    return {
      kind: "explore",
      title: "Posted general explanation"
    };
  }
  return;
}