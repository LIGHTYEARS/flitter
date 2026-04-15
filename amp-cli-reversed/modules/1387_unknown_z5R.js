function z5R(T, R) {
  let a = R.find(h => h.trim() !== "");
  if (!a) return "";
  let e = a.trim(),
    t = [];
  for (let h = 0; h < T.length; h++) if (T[h].trim() === e) {
    if (t.push(h), t.length >= 3) break;
  }
  if (t.length === 0) return "";
  let r = t.map(h => {
    let i = Math.max(0, h - 2),
      c = Math.min(T.length, h + 3),
      s = T.slice(i, c).map((A, l) => {
        return `${(i + l + 1).toString().padStart(5)}| ${A}`;
      }).join(`
`);
    return `
...around line ${h + 1}:
${s}`;
  });
  return `

Debug hint: found ${t.length} candidate location(s) for first line ${JSON.stringify(e)}.${r.join("")}`;
}