// Module: stringify-string
// Original: DN
// Type: CJS (RT wrapper)
// Exports: stringifyString
// Category: util

// Module: DN (CJS)
(T) => {
  var R = Qa(),
    a = DPR(),
    e = (n, p) => ({
      indentAtStart: p ? n.indent.length : n.indentAtStart,
      lineWidth: n.options.lineWidth,
      minContentWidth: n.options.minContentWidth,
    }),
    t = (n) => /^(%|---|\.\.\.)/m.test(n);
  function r(n, p, _) {
    if (!p || p < 0) return !1;
    let m = p - _,
      b = n.length;
    if (b <= m) return !1;
    for (let y = 0, u = 0; y < b; ++y)
      if (
        n[y] ===
        `
`
      ) {
        if (y - u > m) return !0;
        if (((u = y + 1), b - u <= m)) return !1;
      }
    return !0;
  }
  function h(n, p) {
    let _ = JSON.stringify(n);
    if (p.options.doubleQuotedAsJSON) return _;
    let { implicitKey: m } = p,
      b = p.options.doubleQuotedMinMultiLineLength,
      y = p.indent || (t(n) ? "  " : ""),
      u = "",
      P = 0;
    for (let k = 0, x = _[k]; x; x = _[++k]) {
      if (x === " " && _[k + 1] === "\\" && _[k + 2] === "n")
        ((u += _.slice(P, k) + "\\ "), (k += 1), (P = k), (x = "\\"));
      if (x === "\\")
        switch (_[k + 1]) {
          case "u":
            {
              u += _.slice(P, k);
              let f = _.substr(k + 2, 4);
              switch (f) {
                case "0000":
                  u += "\\0";
                  break;
                case "0007":
                  u += "\\a";
                  break;
                case "000b":
                  u += "\\v";
                  break;
                case "001b":
                  u += "\\e";
                  break;
                case "0085":
                  u += "\\N";
                  break;
                case "00a0":
                  u += "\\_";
                  break;
                case "2028":
                  u += "\\L";
                  break;
                case "2029":
                  u += "\\P";
                  break;
                default:
                  if (f.substr(0, 2) === "00") u += "\\x" + f.substr(2);
                  else u += _.substr(k, 6);
              }
              ((k += 5), (P = k + 1));
            }
            break;
          case "n":
            if (m || _[k + 2] === '"' || _.length < b) k += 1;
            else {
              u +=
                _.slice(P, k) +
                `

`;
              while (_[k + 2] === "\\" && _[k + 3] === "n" && _[k + 4] !== '"')
                ((u += `
`),
                  (k += 2));
              if (((u += y), _[k + 2] === " ")) u += "\\";
              ((k += 1), (P = k + 1));
            }
            break;
          default:
            k += 1;
        }
    }
    return (
      (u = P ? u + _.slice(P) : _),
      m ? u : a.foldFlowLines(u, y, a.FOLD_QUOTED, e(p, !1))
    );
  }
  function i(n, p) {
    if (
      p.options.singleQuote === !1 ||
      (p.implicitKey &&
        n.includes(`
`)) ||
      /[ \t]\n|\n[ \t]/.test(n)
    )
      return h(n, p);
    let _ = p.indent || (t(n) ? "  " : ""),
      m =
        "'" +
        n.replace(/'/g, "''").replace(
          /\n+/g,
          `$&
${_}`,
        ) +
        "'";
    return p.implicitKey ? m : a.foldFlowLines(m, _, a.FOLD_FLOW, e(p, !1));
  }
  function c(n, p) {
    let { singleQuote: _ } = p.options,
      m;
    if (_ === !1) m = h;
    else {
      let b = n.includes('"'),
        y = n.includes("'");
      if (b && !y) m = i;
      else if (y && !b) m = h;
      else m = _ ? i : h;
    }
    return m(n, p);
  }
  var s;
  try {
    s = new RegExp(
      `(^|(?<!
))
+(?!
|$)`,
      "g",
    );
  } catch {
    s = /\n+(?!\n|$)/g;
  }
  function A({ comment: n, type: p, value: _ }, m, b, y) {
    let { blockQuote: u, commentString: P, lineWidth: k } = m.options;
    if (!u || /\n[\t ]+$/.test(_)) return c(_, m);
    let x = m.indent || (m.forceBlockIndent || t(_) ? "  " : ""),
      f =
        u === "literal"
          ? !0
          : u === "folded" || p === R.Scalar.BLOCK_FOLDED
            ? !1
            : p === R.Scalar.BLOCK_LITERAL
              ? !0
              : !r(_, k, x.length);
    if (!_)
      return f
        ? `|
`
        : `>
`;
    let v, g;
    for (g = _.length; g > 0; --g) {
      let w = _[g - 1];
      if (
        w !==
          `
` &&
        w !== "\t" &&
        w !== " "
      )
        break;
    }
    let I = _.substring(g),
      S = I.indexOf(`
`);
    if (S === -1) v = "-";
    else if (_ === I || S !== I.length - 1) {
      if (((v = "+"), y)) y();
    } else v = "";
    if (I) {
      if (
        ((_ = _.slice(0, -I.length)),
        I[I.length - 1] ===
          `
`)
      )
        I = I.slice(0, -1);
      I = I.replace(s, `$&${x}`);
    }
    let O = !1,
      j,
      d = -1;
    for (j = 0; j < _.length; ++j) {
      let w = _[j];
      if (w === " ") O = !0;
      else if (
        w ===
        `
`
      )
        d = j;
      else break;
    }
    let C = _.substring(0, d < j ? d + 1 : j);
    if (C) ((_ = _.substring(C.length)), (C = C.replace(/\n+/g, `$&${x}`)));
    let L = (O ? (x ? "2" : "1") : "") + v;
    if (n) {
      if (((L += " " + P(n.replace(/ ?[\r\n]+/g, " "))), b)) b();
    }
    if (!f) {
      let w = _.replace(
          /\n+/g,
          `
$&`,
        )
          .replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2")
          .replace(/\n+/g, `$&${x}`),
        D = !1,
        B = e(m, !0);
      if (u !== "folded" && p !== R.Scalar.BLOCK_FOLDED)
        B.onOverflow = () => {
          D = !0;
        };
      let M = a.foldFlowLines(`${C}${w}${I}`, x, a.FOLD_BLOCK, B);
      if (!D)
        return `>${L}
${x}${M}`;
    }
    return (
      (_ = _.replace(/\n+/g, `$&${x}`)),
      `|${L}
${x}${C}${_}${I}`
    );
  }
  function l(n, p, _, m) {
    let { type: b, value: y } = n,
      {
        actualString: u,
        implicitKey: P,
        indent: k,
        indentStep: x,
        inFlow: f,
      } = p;
    if (
      (P &&
        y.includes(`
`)) ||
      (f && /[[\]{},]/.test(y))
    )
      return c(y, p);
    if (
      /^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(
        y,
      )
    )
      return P ||
        f ||
        !y.includes(`
`)
        ? c(y, p)
        : A(n, p, _, m);
    if (
      !P &&
      !f &&
      b !== R.Scalar.PLAIN &&
      y.includes(`
`)
    )
      return A(n, p, _, m);
    if (t(y)) {
      if (k === "") return ((p.forceBlockIndent = !0), A(n, p, _, m));
      else if (P && k === x) return c(y, p);
    }
    let v = y.replace(
      /\n+/g,
      `$&
${k}`,
    );
    if (u) {
      let g = (O) =>
          O.default && O.tag !== "tag:yaml.org,2002:str" && O.test?.test(v),
        { compat: I, tags: S } = p.doc.schema;
      if (S.some(g) || I?.some(g)) return c(y, p);
    }
    return P ? v : a.foldFlowLines(v, k, a.FOLD_FLOW, e(p, !1));
  }
  function o(n, p, _, m) {
    let { implicitKey: b, inFlow: y } = p,
      u =
        typeof n.value === "string"
          ? n
          : Object.assign({}, n, { value: String(n.value) }),
      { type: P } = n;
    if (P !== R.Scalar.QUOTE_DOUBLE) {
      if (/[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(u.value))
        P = R.Scalar.QUOTE_DOUBLE;
    }
    let k = (f) => {
        switch (f) {
          case R.Scalar.BLOCK_FOLDED:
          case R.Scalar.BLOCK_LITERAL:
            return b || y ? c(u.value, p) : A(u, p, _, m);
          case R.Scalar.QUOTE_DOUBLE:
            return h(u.value, p);
          case R.Scalar.QUOTE_SINGLE:
            return i(u.value, p);
          case R.Scalar.PLAIN:
            return l(u, p, _, m);
          default:
            return null;
        }
      },
      x = k(P);
    if (x === null) {
      let { defaultKeyType: f, defaultStringType: v } = p.options,
        g = (b && f) || v;
      if (((x = k(g)), x === null))
        throw Error(`Unsupported default string type ${g}`);
    }
    return x;
  }
  T.stringifyString = o;
};
