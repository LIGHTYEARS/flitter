function xj0(T, R, a, e) {
  let t = Math.max(Math.min(6, T.depth || 1), 1),
    r = a.createTracker(e);
  if (sQT(T, a)) {
    let A = a.enter("headingSetext"),
      l = a.enter("phrasing"),
      o = a.containerPhrasing(T, {
        ...r.current(),
        before: `
`,
        after: `
`
      });
    return l(), A(), o + `
` + (t === 1 ? "=" : "-").repeat(o.length - (Math.max(o.lastIndexOf("\r"), o.lastIndexOf(`
`)) + 1));
  }
  let h = "#".repeat(t),
    i = a.enter("headingAtx"),
    c = a.enter("phrasing");
  r.move(h + " ");
  let s = a.containerPhrasing(T, {
    before: "# ",
    after: `
`,
    ...r.current()
  });
  if (/^[\t ]/.test(s)) s = LA(s.charCodeAt(0)) + s.slice(1);
  if (s = s ? h + " " + s : h, a.options.closeAtx) s += " " + h;
  return c(), i(), s;
}