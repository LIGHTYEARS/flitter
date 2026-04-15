function E$0(T, R) {
  let a = T.get(R)[1],
    e = T.get(R)[2],
    t = R - 1,
    r = [],
    h = a._tokenizer;
  if (!h) {
    if (h = e.parser[a.contentType](a.start), a._contentTypeTextTrailing) h._contentTypeTextTrailing = !0;
  }
  let i = h.events,
    c = [],
    s = {},
    A,
    l,
    o = -1,
    n = a,
    p = 0,
    _ = 0,
    m = [_];
  while (n) {
    while (T.get(++t)[1] !== n);
    if (r.push(t), !n._tokenizer) {
      if (A = e.sliceStream(n), !n.next) A.push(null);
      if (l) h.defineSkip(n.start);
      if (n._isInFirstContentOfListItem) h._gfmTasklistFirstContentOfListItem = !0;
      if (h.write(A), n._isInFirstContentOfListItem) h._gfmTasklistFirstContentOfListItem = void 0;
    }
    l = n, n = n.next;
  }
  n = a;
  while (++o < i.length) if (i[o][0] === "exit" && i[o - 1][0] === "enter" && i[o][1].type === i[o - 1][1].type && i[o][1].start.line !== i[o][1].end.line) _ = o + 1, m.push(_), n._tokenizer = void 0, n.previous = void 0, n = n.next;
  if (h.events = [], n) n._tokenizer = void 0, n.previous = void 0;else m.pop();
  o = m.length;
  while (o--) {
    let b = i.slice(m[o], m[o + 1]),
      y = r.pop();
    c.push([y, y + b.length - 1]), T.splice(y, 2, b);
  }
  c.reverse(), o = -1;
  while (++o < c.length) s[p + c[o][0]] = p + c[o][1], p += c[o][1] - c[o][0] - 1;
  return s;
}