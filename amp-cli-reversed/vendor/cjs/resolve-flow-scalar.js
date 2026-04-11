// Module: resolve-flow-scalar
// Original: qDT
// Type: CJS (RT wrapper)
// Exports: resolveFlowScalar
// Category: util

// Module: qDT (CJS)
(T) => {
  var R = Qa(),
    a = pO();
  function e(l, o, n) {
    let { offset: p, type: _, source: m, end: b } = l,
      y,
      u,
      P = (f, v, g) => n(p + f, v, g);
    switch (_) {
      case "scalar":
        ((y = R.Scalar.PLAIN), (u = t(m, P)));
        break;
      case "single-quoted-scalar":
        ((y = R.Scalar.QUOTE_SINGLE), (u = r(m, P)));
        break;
      case "double-quoted-scalar":
        ((y = R.Scalar.QUOTE_DOUBLE), (u = i(m, P)));
        break;
      default:
        return (
          n(
            l,
            "UNEXPECTED_TOKEN",
            `Expected a flow scalar value, but found: ${_}`,
          ),
          {
            value: "",
            type: null,
            comment: "",
            range: [p, p + m.length, p + m.length],
          }
        );
    }
    let k = p + m.length,
      x = a.resolveEnd(b, k, o, n);
    return { value: u, type: y, comment: x.comment, range: [p, k, x.offset] };
  }
  function t(l, o) {
    let n = "";
    switch (l[0]) {
      case "\t":
        n = "a tab character";
        break;
      case ",":
        n = "flow indicator character ,";
        break;
      case "%":
        n = "directive indicator character %";
        break;
      case "|":
      case ">": {
        n = `block scalar indicator ${l[0]}`;
        break;
      }
      case "@":
      case "`": {
        n = `reserved character ${l[0]}`;
        break;
      }
    }
    if (n) o(0, "BAD_SCALAR_START", `Plain value cannot start with ${n}`);
    return h(l);
  }
  function r(l, o) {
    if (l[l.length - 1] !== "'" || l.length === 1)
      o(l.length, "MISSING_CHAR", "Missing closing 'quote");
    return h(l.slice(1, -1)).replace(/''/g, "'");
  }
  function h(l) {
    let o, n;
    try {
      ((o = new RegExp(
        `(.*?)(?<![ 	])[ 	]*\r?
`,
        "sy",
      )),
        (n = new RegExp(
          `[ 	]*(.*?)(?:(?<![ 	])[ 	]*)?\r?
`,
          "sy",
        )));
    } catch {
      ((o = /(.*?)[ \t]*\r?\n/sy), (n = /[ \t]*(.*?)[ \t]*\r?\n/sy));
    }
    let p = o.exec(l);
    if (!p) return l;
    let _ = p[1],
      m = " ",
      b = o.lastIndex;
    n.lastIndex = b;
    while ((p = n.exec(l))) {
      if (p[1] === "")
        if (
          m ===
          `
`
        )
          _ += m;
        else
          m = `
`;
      else ((_ += m + p[1]), (m = " "));
      b = n.lastIndex;
    }
    let y = /[ \t]*(.*)/sy;
    return ((y.lastIndex = b), (p = y.exec(l)), _ + m + (p?.[1] ?? ""));
  }
  function i(l, o) {
    let n = "";
    for (let p = 1; p < l.length - 1; ++p) {
      let _ = l[p];
      if (
        _ === "\r" &&
        l[p + 1] ===
          `
`
      )
        continue;
      if (
        _ ===
        `
`
      ) {
        let { fold: m, offset: b } = c(l, p);
        ((n += m), (p = b));
      } else if (_ === "\\") {
        let m = l[++p],
          b = s[m];
        if (b) n += b;
        else if (
          m ===
          `
`
        ) {
          m = l[p + 1];
          while (m === " " || m === "\t") m = l[++p + 1];
        } else if (
          m === "\r" &&
          l[p + 1] ===
            `
`
        ) {
          m = l[++p + 1];
          while (m === " " || m === "\t") m = l[++p + 1];
        } else if (m === "x" || m === "u" || m === "U") {
          let y = { x: 2, u: 4, U: 8 }[m];
          ((n += A(l, p + 1, y, o)), (p += y));
        } else {
          let y = l.substr(p - 1, 2);
          (o(p - 1, "BAD_DQ_ESCAPE", `Invalid escape sequence ${y}`), (n += y));
        }
      } else if (_ === " " || _ === "\t") {
        let m = p,
          b = l[p + 1];
        while (b === " " || b === "\t") b = l[++p + 1];
        if (
          b !==
            `
` &&
          !(
            b === "\r" &&
            l[p + 2] ===
              `
`
          )
        )
          n += p > m ? l.slice(m, p + 1) : _;
      } else n += _;
    }
    if (l[l.length - 1] !== '"' || l.length === 1)
      o(l.length, "MISSING_CHAR", 'Missing closing "quote');
    return n;
  }
  function c(l, o) {
    let n = "",
      p = l[o + 1];
    while (
      p === " " ||
      p === "\t" ||
      p ===
        `
` ||
      p === "\r"
    ) {
      if (
        p === "\r" &&
        l[o + 2] !==
          `
`
      )
        break;
      if (
        p ===
        `
`
      )
        n += `
`;
      ((o += 1), (p = l[o + 1]));
    }
    if (!n) n = " ";
    return { fold: n, offset: o };
  }
  var s = {
    0: "\x00",
    a: "\x07",
    b: "\b",
    e: "\x1B",
    f: "\f",
    n: `
`,
    r: "\r",
    t: "\t",
    v: "\v",
    N: "\x85",
    _: "\xA0",
    L: "\u2028",
    P: "\u2029",
    " ": " ",
    '"': '"',
    "/": "/",
    "\\": "\\",
    "\t": "\t",
  };
  function A(l, o, n, p) {
    let _ = l.substr(o, n),
      m = _.length === n && /^[0-9a-fA-F]+$/.test(_) ? parseInt(_, 16) : NaN;
    if (isNaN(m)) {
      let b = l.substr(o - 2, n + 2);
      return (p(o - 2, "BAD_DQ_ESCAPE", `Invalid escape sequence ${b}`), b);
    }
    return String.fromCodePoint(m);
  }
  T.resolveFlowScalar = e;
};
