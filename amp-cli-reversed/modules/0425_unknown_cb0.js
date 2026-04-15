function cb0(T, R) {
  let a = (i, c) => {
      if (i.length === 0) return "";
      let s = oR.bold(c) + `

`,
        A = i.map(l => [l.flags, l.description]);
      return s += AtT(A), s + `
`;
    },
    e = "";
  if (T.parent === null) e += oR.bold("Amp CLI") + `

`;
  let t = [];
  {
    let i = T;
    while (i.parent) t.unshift(i.name()), i = i.parent;
    t.unshift(i.name());
  }
  let r = T.usage().replace(/^[^ ]*/, t.join(" ") + " [options]");
  if (e += oR.bold("Usage:") + " " + oR.green(r) + `

`, T.parent !== null && T.description()) e += T.description() + `

`;
  let h = T.commands.filter(i => !i._hidden);
  if (h.length > 0) e += oR.bold("Commands:") + `

`, e += sb0(h), e += `
`;
  if (e += a(T.options.filter(i => !i.hidden), "Options:"), T.parent) {
    let i = T.parent;
    while (i.parent) i = i.parent;
    let c = new Set(T.options.map(s => s.flags));
    e += a(i.options.filter(s => !s.hidden).filter(s => !c.has(s.flags)).filter(s => {
      let A = s.flags.includes("--execute"),
        l = s.flags.includes("--interactive");
      return !A && !l;
    }), "Global options:");
  }
  return e;
}