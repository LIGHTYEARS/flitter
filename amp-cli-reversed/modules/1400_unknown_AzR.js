function AzR(T) {
  let R = /\b(?:F?NR)\s*>=\s*(?<startLine>\d+)\s*&&\s*(?:F?NR)\s*<=\s*(?<endLine>\d+)/.exec(T) ?? /\b(?:F?NR)\s*<=\s*(?<endLine>\d+)\s*&&\s*(?:F?NR)\s*>=\s*(?<startLine>\d+)/.exec(T);
  if (R?.groups) {
    let r = R.groups.startLine,
      h = R.groups.endLine;
    if (!r || !h) return;
    let i = Number.parseInt(r, 10),
      c = Number.parseInt(h, 10);
    if (i >= 1 && c >= i) return [i, c];
  }
  let a = /\b(?:F?NR)\s*==\s*(?<line>\d+)/.exec(T);
  if (!a?.groups) return;
  let e = a.groups.line;
  if (!e) return;
  let t = Number.parseInt(e, 10);
  if (t < 1) return;
  return [t, t];
}