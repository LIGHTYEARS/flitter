function iO0(T, R) {
  return R === "|" ? R : T;
}
function cO0(T) {
  let R = T || {},
    a = R.tableCellPadding,
    e = R.tablePipeAlign,
    t = R.stringLength,
    r = a ? " " : "|";
  return {
    unsafe: [{
      character: "\r",
      inConstruct: "tableCell"
    }, {
      character: `
`,
      inConstruct: "tableCell"
    }, {
      atBreak: !0,
      character: "|",
      after: "[\t :-]"
    }, {
      character: "|",
      inConstruct: "tableCell"
    }, {
      atBreak: !0,
      character: ":",
      after: "-"
    }, {
      atBreak: !0,
      character: "-",
      after: "[:|-]"
    }],
    handlers: {
      inlineCode: o,
      table: h,
      tableCell: c,
      tableRow: i
    }
  };
  function h(n, p, _, m) {
    return s(A(n, _, m), n.align);
  }
  function i(n, p, _, m) {
    let b = l(n, _, m),
      y = s([b]);
    return y.slice(0, y.indexOf(`
`));
  }
  function c(n, p, _, m) {
    let b = _.enter("tableCell"),
      y = _.enter("phrasing"),
      u = _.containerPhrasing(n, {
        ...m,
        before: r,
        after: r
      });
    return y(), b(), u;
  }
  function s(n, p) {
    return TO0(n, {
      align: p,
      alignDelimiters: e,
      padding: a,
      stringLength: t
    });
  }
  function A(n, p, _) {
    let m = n.children,
      b = -1,
      y = [],
      u = p.enter("table");
    while (++b < m.length) y[b] = l(m[b], p, _);
    return u(), y;
  }
  function l(n, p, _) {
    let m = n.children,
      b = -1,
      y = [],
      u = p.enter("tableRow");
    while (++b < m.length) y[b] = c(m[b], n, p, _);
    return u(), y;
  }
  function o(n, p, _) {
    let m = hrT.inlineCode(n, p, _);
    if (_.stack.includes("tableCell")) m = m.replace(/\|/g, "\\$&");
    return m;
  }
}