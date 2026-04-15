function p$0(T, R) {
  let a = this.parser.constructs.attentionMarkers.null,
    e = this.previous,
    t = Zk(e),
    r;
  return h;
  function h(c) {
    return r = c, T.enter("attentionSequence"), i(c);
  }
  function i(c) {
    if (c === r) return T.consume(c), i;
    let s = T.exit("attentionSequence"),
      A = Zk(c),
      l = !A || A === 2 && t || a.includes(c),
      o = !t || t === 2 && A || a.includes(e);
    return s._open = Boolean(r === 42 ? l : l && (t || !o)), s._close = Boolean(r === 42 ? o : o && (A || !l)), R(c);
  }
}