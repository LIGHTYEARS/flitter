// Module: create-scalar-token
// Original: TkR
// Type: CJS (RT wrapper)
// Exports: createScalarToken, resolveAsScalar, setScalarValue
// Category: util

// Module: TkR (CJS)
(T) => {
  var R = WDT(),
    a = qDT(),
    e = UN(),
    t = DN();
  function r(l, o = !0, n) {
    if (l) {
      let p = (_, m, b) => {
        let y = typeof _ === "number" ? _ : Array.isArray(_) ? _[0] : _.offset;
        if (n) n(y, m, b);
        else throw new e.YAMLParseError([y, y + 1], m, b);
      };
      switch (l.type) {
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
          return a.resolveFlowScalar(l, o, p);
        case "block-scalar":
          return R.resolveBlockScalar({ options: { strict: o } }, l, p);
      }
    }
    return null;
  }
  function h(l, o) {
    let {
        implicitKey: n = !1,
        indent: p,
        inFlow: _ = !1,
        offset: m = -1,
        type: b = "PLAIN",
      } = o,
      y = t.stringifyString(
        { type: b, value: l },
        {
          implicitKey: n,
          indent: p > 0 ? " ".repeat(p) : "",
          inFlow: _,
          options: { blockQuote: !0, lineWidth: -1 },
        },
      ),
      u = o.end ?? [
        {
          type: "newline",
          offset: -1,
          indent: p,
          source: `
`,
        },
      ];
    switch (y[0]) {
      case "|":
      case ">": {
        let P = y.indexOf(`
`),
          k = y.substring(0, P),
          x =
            y.substring(P + 1) +
            `
`,
          f = [
            { type: "block-scalar-header", offset: m, indent: p, source: k },
          ];
        if (!s(f, u))
          f.push({
            type: "newline",
            offset: -1,
            indent: p,
            source: `
`,
          });
        return {
          type: "block-scalar",
          offset: m,
          indent: p,
          props: f,
          source: x,
        };
      }
      case '"':
        return {
          type: "double-quoted-scalar",
          offset: m,
          indent: p,
          source: y,
          end: u,
        };
      case "'":
        return {
          type: "single-quoted-scalar",
          offset: m,
          indent: p,
          source: y,
          end: u,
        };
      default:
        return { type: "scalar", offset: m, indent: p, source: y, end: u };
    }
  }
  function i(l, o, n = {}) {
    let { afterKey: p = !1, implicitKey: _ = !1, inFlow: m = !1, type: b } = n,
      y = "indent" in l ? l.indent : null;
    if (p && typeof y === "number") y += 2;
    if (!b)
      switch (l.type) {
        case "single-quoted-scalar":
          b = "QUOTE_SINGLE";
          break;
        case "double-quoted-scalar":
          b = "QUOTE_DOUBLE";
          break;
        case "block-scalar": {
          let P = l.props[0];
          if (P.type !== "block-scalar-header")
            throw Error("Invalid block scalar header");
          b = P.source[0] === ">" ? "BLOCK_FOLDED" : "BLOCK_LITERAL";
          break;
        }
        default:
          b = "PLAIN";
      }
    let u = t.stringifyString(
      { type: b, value: o },
      {
        implicitKey: _ || y === null,
        indent: y !== null && y > 0 ? " ".repeat(y) : "",
        inFlow: m,
        options: { blockQuote: !0, lineWidth: -1 },
      },
    );
    switch (u[0]) {
      case "|":
      case ">":
        c(l, u);
        break;
      case '"':
        A(l, u, "double-quoted-scalar");
        break;
      case "'":
        A(l, u, "single-quoted-scalar");
        break;
      default:
        A(l, u, "scalar");
    }
  }
  function c(l, o) {
    let n = o.indexOf(`
`),
      p = o.substring(0, n),
      _ =
        o.substring(n + 1) +
        `
`;
    if (l.type === "block-scalar") {
      let m = l.props[0];
      if (m.type !== "block-scalar-header")
        throw Error("Invalid block scalar header");
      ((m.source = p), (l.source = _));
    } else {
      let { offset: m } = l,
        b = "indent" in l ? l.indent : -1,
        y = [{ type: "block-scalar-header", offset: m, indent: b, source: p }];
      if (!s(y, "end" in l ? l.end : void 0))
        y.push({
          type: "newline",
          offset: -1,
          indent: b,
          source: `
`,
        });
      for (let u of Object.keys(l))
        if (u !== "type" && u !== "offset") delete l[u];
      Object.assign(l, {
        type: "block-scalar",
        indent: b,
        props: y,
        source: _,
      });
    }
  }
  function s(l, o) {
    if (o)
      for (let n of o)
        switch (n.type) {
          case "space":
          case "comment":
            l.push(n);
            break;
          case "newline":
            return (l.push(n), !0);
        }
    return !1;
  }
  function A(l, o, n) {
    switch (l.type) {
      case "scalar":
      case "double-quoted-scalar":
      case "single-quoted-scalar":
        ((l.type = n), (l.source = o));
        break;
      case "block-scalar": {
        let p = l.props.slice(1),
          _ = o.length;
        if (l.props[0].type === "block-scalar-header")
          _ -= l.props[0].source.length;
        for (let m of p) m.offset += _;
        (delete l.props, Object.assign(l, { type: n, source: o, end: p }));
        break;
      }
      case "block-map":
      case "block-seq": {
        let p = {
          type: "newline",
          offset: l.offset + o.length,
          indent: l.indent,
          source: `
`,
        };
        (delete l.items, Object.assign(l, { type: n, source: o, end: [p] }));
        break;
      }
      default: {
        let p = "indent" in l ? l.indent : -1,
          _ =
            "end" in l && Array.isArray(l.end)
              ? l.end.filter(
                  (m) =>
                    m.type === "space" ||
                    m.type === "comment" ||
                    m.type === "newline",
                )
              : [];
        for (let m of Object.keys(l))
          if (m !== "type" && m !== "offset") delete l[m];
        Object.assign(l, { type: n, indent: p, source: o, end: _ });
      }
    }
  }
  ((T.createScalarToken = h), (T.resolveAsScalar = r), (T.setScalarValue = i));
};
