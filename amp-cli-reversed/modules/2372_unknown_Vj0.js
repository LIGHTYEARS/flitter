function Vj0(T, R, a) {
  let e = R.indexStack,
    t = T.children || [],
    r = R.createTracker(a),
    h = [],
    i = -1;
  e.push(-1);
  while (++i < t.length) {
    let c = t[i];
    if (e[e.length - 1] = i, h.push(r.move(R.handle(c, T, R, {
      before: `
`,
      after: `
`,
      ...r.current()
    }))), c.type !== "list") R.bulletLastUsed = void 0;
    if (i < t.length - 1) h.push(r.move(Xj0(c, t[i + 1], T, R)));
  }
  return e.pop(), h.join("");
}