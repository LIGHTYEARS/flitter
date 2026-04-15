function Kj0(T, R, a) {
  let e = R.indexStack,
    t = T.children || [],
    r = [],
    h = -1,
    i = a.before,
    c;
  e.push(-1);
  let s = R.createTracker(a);
  while (++h < t.length) {
    let A = t[h],
      l;
    if (e[e.length - 1] = h, h + 1 < t.length) {
      let p = R.handle.handlers[t[h + 1].type];
      if (p && p.peek) p = p.peek;
      l = p ? p(t[h + 1], T, R, {
        before: "",
        after: "",
        ...s.current()
      }).charAt(0) : "";
    } else l = a.after;
    if (r.length > 0 && (i === "\r" || i === `
`) && A.type === "html") r[r.length - 1] = r[r.length - 1].replace(/(\r?\n|\r)$/, " "), i = " ", s = R.createTracker(a), s.move(r.join(""));
    let o = R.handle(A, T, R, {
      ...s.current(),
      after: l,
      before: i
    });
    if (c && c === o.slice(0, 1)) o = LA(c.charCodeAt(0)) + o.slice(1);
    let n = R.attentionEncodeSurroundingInfo;
    if (R.attentionEncodeSurroundingInfo = void 0, c = void 0, n) {
      if (r.length > 0 && n.before && i === r[r.length - 1].slice(-1)) r[r.length - 1] = r[r.length - 1].slice(0, -1) + LA(i.charCodeAt(0));
      if (n.after) c = l;
    }
    s.move(o), r.push(o), i = o.slice(-1);
  }
  return e.pop(), r.join("");
}