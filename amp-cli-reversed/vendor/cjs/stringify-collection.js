// Module: stringify-collection
// Original: dDT
// Type: CJS (RT wrapper)
// Exports: stringifyCollection
// Category: util

// Module: dDT (CJS)
(T) => {
  var R = x8(),
    a = wN(),
    e = MN();
  function t(c, s, A) {
    return ((s.inFlow ?? c.flow) ? h : r)(c, s, A);
  }
  function r(
    { comment: c, items: s },
    A,
    {
      blockItemPrefix: l,
      flowChars: o,
      itemIndent: n,
      onChompKeep: p,
      onComment: _,
    },
  ) {
    let {
        indent: m,
        options: { commentString: b },
      } = A,
      y = Object.assign({}, A, { indent: n, type: null }),
      u = !1,
      P = [];
    for (let x = 0; x < s.length; ++x) {
      let f = s[x],
        v = null;
      if (R.isNode(f)) {
        if (!u && f.spaceBefore) P.push("");
        if ((i(A, P, f.commentBefore, u), f.comment)) v = f.comment;
      } else if (R.isPair(f)) {
        let I = R.isNode(f.key) ? f.key : null;
        if (I) {
          if (!u && I.spaceBefore) P.push("");
          i(A, P, I.commentBefore, u);
        }
      }
      u = !1;
      let g = a.stringify(
        f,
        y,
        () => (v = null),
        () => (u = !0),
      );
      if (v) g += e.lineComment(g, n, b(v));
      if (u && v) u = !1;
      P.push(l + g);
    }
    let k;
    if (P.length === 0) k = o.start + o.end;
    else {
      k = P[0];
      for (let x = 1; x < P.length; ++x) {
        let f = P[x];
        k += f
          ? `
${m}${f}`
          : `
`;
      }
    }
    if (c) {
      if (
        ((k +=
          `
` + e.indentComment(b(c), m)),
        _)
      )
        _();
    } else if (u && p) p();
    return k;
  }
  function h({ items: c }, s, { flowChars: A, itemIndent: l }) {
    let {
      indent: o,
      indentStep: n,
      flowCollectionPadding: p,
      options: { commentString: _ },
    } = s;
    l += n;
    let m = Object.assign({}, s, { indent: l, inFlow: !0, type: null }),
      b = !1,
      y = 0,
      u = [];
    for (let x = 0; x < c.length; ++x) {
      let f = c[x],
        v = null;
      if (R.isNode(f)) {
        if (f.spaceBefore) u.push("");
        if ((i(s, u, f.commentBefore, !1), f.comment)) v = f.comment;
      } else if (R.isPair(f)) {
        let I = R.isNode(f.key) ? f.key : null;
        if (I) {
          if (I.spaceBefore) u.push("");
          if ((i(s, u, I.commentBefore, !1), I.comment)) b = !0;
        }
        let S = R.isNode(f.value) ? f.value : null;
        if (S) {
          if (S.comment) v = S.comment;
          if (S.commentBefore) b = !0;
        } else if (f.value == null && I?.comment) v = I.comment;
      }
      if (v) b = !0;
      let g = a.stringify(f, m, () => (v = null));
      if (x < c.length - 1) g += ",";
      if (v) g += e.lineComment(g, l, _(v));
      if (
        !b &&
        (u.length > y ||
          g.includes(`
`))
      )
        b = !0;
      (u.push(g), (y = u.length));
    }
    let { start: P, end: k } = A;
    if (u.length === 0) return P + k;
    else {
      if (!b) {
        let x = u.reduce((f, v) => f + v.length + 2, 2);
        b = s.options.lineWidth > 0 && x > s.options.lineWidth;
      }
      if (b) {
        let x = P;
        for (let f of u)
          x += f
            ? `
${n}${o}${f}`
            : `
`;
        return `${x}
${o}${k}`;
      } else return `${P}${p}${u.join(" ")}${p}${k}`;
    }
  }
  function i({ indent: c, options: { commentString: s } }, A, l, o) {
    if (l && o) l = l.replace(/^\n+/, "");
    if (l) {
      let n = e.indentComment(s(l), c);
      A.push(n.trimStart());
    }
  }
  T.stringifyCollection = t;
};
