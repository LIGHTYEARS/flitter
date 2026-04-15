function LFR(T) {
  let R = i3(T, "codeReview");
  if (!R) return {
    comments: []
  };
  let a = Lk(R, "comment"),
    e = [];
  for (let t of a) {
    let r = i3(t, "filename") || "",
      h = parseInt(i3(t, "startLine") || "0", 10),
      i = parseInt(i3(t, "endLine") || "0", 10),
      c = i3(t, "text") || "",
      s = i3(t, "commentType")?.trim(),
      A = s ? CFR.includes(s) ? s : "unknown" : void 0,
      l = i3(t, "severity")?.trim(),
      o = l && ["critical", "high", "medium", "low"].includes(l) ? l : void 0,
      n = i3(t, "why")?.trim(),
      p = i3(t, "fix")?.trim();
    e.push({
      filename: r,
      startLine: h,
      endLine: i,
      text: c,
      commentType: A,
      severity: o,
      why: n,
      fix: p
    });
  }
  return {
    comments: e
  };
}