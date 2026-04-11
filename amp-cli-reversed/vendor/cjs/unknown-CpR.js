// Module: unknown-CpR
// Original: CpR
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: CpR (CJS)
(T, R) => {
  var a = bN(),
    e = mN(),
    {
      MAX_LENGTH: t,
      POSIX_REGEX_SOURCE: r,
      REGEX_NON_SPECIAL_CHARS: h,
      REGEX_SPECIAL_CHARS_BACKREF: i,
      REPLACEMENTS: c,
    } = a,
    s = (o, n) => {
      if (typeof n.expandRange === "function") return n.expandRange(...o, n);
      o.sort();
      let p = `[${o.join("-")}]`;
      try {
        new RegExp(p);
      } catch (_) {
        return o.map((m) => e.escapeRegex(m)).join("..");
      }
      return p;
    },
    A = (o, n) => {
      return `Missing ${o}: "${n}" - use "\\\\${n}" to match literal characters`;
    },
    l = (o, n) => {
      if (typeof o !== "string") throw TypeError("Expected a string");
      o = c[o] || o;
      let p = { ...n },
        _ = typeof p.maxLength === "number" ? Math.min(t, p.maxLength) : t,
        m = o.length;
      if (m > _)
        throw SyntaxError(
          `Input length: ${m}, exceeds maximum allowed length: ${_}`,
        );
      let b = { type: "bos", value: "", output: p.prepend || "" },
        y = [b],
        u = p.capture ? "" : "?:",
        P = a.globChars(p.windows),
        k = a.extglobChars(P),
        {
          DOT_LITERAL: x,
          PLUS_LITERAL: f,
          SLASH_LITERAL: v,
          ONE_CHAR: g,
          DOTS_SLASH: I,
          NO_DOT: S,
          NO_DOT_SLASH: O,
          NO_DOTS_SLASH: j,
          QMARK: d,
          QMARK_NO_DOT: C,
          STAR: L,
          START_ANCHOR: w,
        } = P,
        D = (pT) => {
          return `(${u}(?:(?!${w}${pT.dot ? I : x}).)*?)`;
        },
        B = p.dot ? "" : S,
        M = p.dot ? d : C,
        V = p.bash === !0 ? D(p) : L;
      if (p.capture) V = `(${V})`;
      if (typeof p.noext === "boolean") p.noextglob = p.noext;
      let Q = {
        input: o,
        index: -1,
        start: 0,
        dot: p.dot === !0,
        consumed: "",
        output: "",
        prefix: "",
        backtrack: !1,
        negated: !1,
        brackets: 0,
        braces: 0,
        parens: 0,
        quotes: 0,
        globstar: !1,
        tokens: y,
      };
      ((o = e.removePrefix(o, Q)), (m = o.length));
      let W = [],
        eT = [],
        iT = [],
        aT = b,
        oT,
        TT = () => Q.index === m - 1,
        tT = (Q.peek = (pT = 1) => o[Q.index + pT]),
        lT = (Q.advance = () => o[++Q.index] || ""),
        N = () => o.slice(Q.index + 1),
        q = (pT = "", mT = 0) => {
          ((Q.consumed += pT), (Q.index += mT));
        },
        F = (pT) => {
          ((Q.output += pT.output != null ? pT.output : pT.value), q(pT.value));
        },
        E = () => {
          let pT = 1;
          while (tT() === "!" && (tT(2) !== "(" || tT(3) === "?"))
            (lT(), Q.start++, pT++);
          if (pT % 2 === 0) return !1;
          return ((Q.negated = !0), Q.start++, !0);
        },
        U = (pT) => {
          (Q[pT]++, iT.push(pT));
        },
        Z = (pT) => {
          (Q[pT]--, iT.pop());
        },
        X = (pT) => {
          if (aT.type === "globstar") {
            let mT =
                Q.braces > 0 && (pT.type === "comma" || pT.type === "brace"),
              yT =
                pT.extglob === !0 ||
                (W.length && (pT.type === "pipe" || pT.type === "paren"));
            if (pT.type !== "slash" && pT.type !== "paren" && !mT && !yT)
              ((Q.output = Q.output.slice(0, -aT.output.length)),
                (aT.type = "star"),
                (aT.value = "*"),
                (aT.output = V),
                (Q.output += aT.output));
          }
          if (W.length && pT.type !== "paren")
            W[W.length - 1].inner += pT.value;
          if (pT.value || pT.output) F(pT);
          if (aT && aT.type === "text" && pT.type === "text") {
            ((aT.output = (aT.output || aT.value) + pT.value),
              (aT.value += pT.value));
            return;
          }
          ((pT.prev = aT), y.push(pT), (aT = pT));
        },
        rT = (pT, mT) => {
          let yT = { ...k[mT], conditions: 1, inner: "" };
          ((yT.prev = aT), (yT.parens = Q.parens), (yT.output = Q.output));
          let uT = (p.capture ? "(" : "") + yT.open;
          (U("parens"),
            X({ type: pT, value: mT, output: Q.output ? "" : g }),
            X({ type: "paren", extglob: !0, value: lT(), output: uT }),
            W.push(yT));
        },
        hT = (pT) => {
          let mT = pT.close + (p.capture ? ")" : ""),
            yT;
          if (pT.type === "negate") {
            let uT = V;
            if (pT.inner && pT.inner.length > 1 && pT.inner.includes("/"))
              uT = D(p);
            if (uT !== V || TT() || /^\)+$/.test(N()))
              mT = pT.close = `)$))${uT}`;
            if (
              pT.inner.includes("*") &&
              (yT = N()) &&
              /^\.[^\\/.]+$/.test(yT)
            ) {
              let bT = l(yT, { ...n, fastpaths: !1 }).output;
              mT = pT.close = `)${bT})${uT})`;
            }
            if (pT.prev.type === "bos") Q.negatedExtglob = !0;
          }
          (X({ type: "paren", extglob: !0, value: oT, output: mT }),
            Z("parens"));
        };
      if (p.fastpaths !== !1 && !/(^[*!]|[/()[\]{}"])/.test(o)) {
        let pT = !1,
          mT = o.replace(i, (yT, uT, bT, jT, fT, MT) => {
            if (jT === "\\") return ((pT = !0), yT);
            if (jT === "?") {
              if (uT) return uT + jT + (fT ? d.repeat(fT.length) : "");
              if (MT === 0) return M + (fT ? d.repeat(fT.length) : "");
              return d.repeat(bT.length);
            }
            if (jT === ".") return x.repeat(bT.length);
            if (jT === "*") {
              if (uT) return uT + jT + (fT ? V : "");
              return V;
            }
            return uT ? yT : `\\${yT}`;
          });
        if (pT === !0)
          if (p.unescape === !0) mT = mT.replace(/\\/g, "");
          else
            mT = mT.replace(/\\+/g, (yT) => {
              return yT.length % 2 === 0 ? "\\\\" : yT ? "\\" : "";
            });
        if (mT === o && p.contains === !0) return ((Q.output = o), Q);
        return ((Q.output = e.wrapOutput(mT, Q, n)), Q);
      }
      while (!TT()) {
        if (((oT = lT()), oT === "\x00")) continue;
        if (oT === "\\") {
          let yT = tT();
          if (yT === "/" && p.bash !== !0) continue;
          if (yT === "." || yT === ";") continue;
          if (!yT) {
            ((oT += "\\"), X({ type: "text", value: oT }));
            continue;
          }
          let uT = /^\\+/.exec(N()),
            bT = 0;
          if (uT && uT[0].length > 2) {
            if (((bT = uT[0].length), (Q.index += bT), bT % 2 !== 0))
              oT += "\\";
          }
          if (p.unescape === !0) oT = lT();
          else oT += lT();
          if (Q.brackets === 0) {
            X({ type: "text", value: oT });
            continue;
          }
        }
        if (
          Q.brackets > 0 &&
          (oT !== "]" || aT.value === "[" || aT.value === "[^")
        ) {
          if (p.posix !== !1 && oT === ":") {
            let yT = aT.value.slice(1);
            if (yT.includes("[")) {
              if (((aT.posix = !0), yT.includes(":"))) {
                let uT = aT.value.lastIndexOf("["),
                  bT = aT.value.slice(0, uT),
                  jT = aT.value.slice(uT + 2),
                  fT = r[jT];
                if (fT) {
                  if (
                    ((aT.value = bT + fT),
                    (Q.backtrack = !0),
                    lT(),
                    !b.output && y.indexOf(aT) === 1)
                  )
                    b.output = g;
                  continue;
                }
              }
            }
          }
          if ((oT === "[" && tT() !== ":") || (oT === "-" && tT() === "]"))
            oT = `\\${oT}`;
          if (oT === "]" && (aT.value === "[" || aT.value === "[^"))
            oT = `\\${oT}`;
          if (p.posix === !0 && oT === "!" && aT.value === "[") oT = "^";
          ((aT.value += oT), F({ value: oT }));
          continue;
        }
        if (Q.quotes === 1 && oT !== '"') {
          ((oT = e.escapeRegex(oT)), (aT.value += oT), F({ value: oT }));
          continue;
        }
        if (oT === '"') {
          if (((Q.quotes = Q.quotes === 1 ? 0 : 1), p.keepQuotes === !0))
            X({ type: "text", value: oT });
          continue;
        }
        if (oT === "(") {
          (U("parens"), X({ type: "paren", value: oT }));
          continue;
        }
        if (oT === ")") {
          if (Q.parens === 0 && p.strictBrackets === !0)
            throw SyntaxError(A("opening", "("));
          let yT = W[W.length - 1];
          if (yT && Q.parens === yT.parens + 1) {
            hT(W.pop());
            continue;
          }
          (X({ type: "paren", value: oT, output: Q.parens ? ")" : "\\)" }),
            Z("parens"));
          continue;
        }
        if (oT === "[") {
          if (p.nobracket === !0 || !N().includes("]")) {
            if (p.nobracket !== !0 && p.strictBrackets === !0)
              throw SyntaxError(A("closing", "]"));
            oT = `\\${oT}`;
          } else U("brackets");
          X({ type: "bracket", value: oT });
          continue;
        }
        if (oT === "]") {
          if (
            p.nobracket === !0 ||
            (aT && aT.type === "bracket" && aT.value.length === 1)
          ) {
            X({ type: "text", value: oT, output: `\\${oT}` });
            continue;
          }
          if (Q.brackets === 0) {
            if (p.strictBrackets === !0) throw SyntaxError(A("opening", "["));
            X({ type: "text", value: oT, output: `\\${oT}` });
            continue;
          }
          Z("brackets");
          let yT = aT.value.slice(1);
          if (aT.posix !== !0 && yT[0] === "^" && !yT.includes("/"))
            oT = `/${oT}`;
          if (
            ((aT.value += oT),
            F({ value: oT }),
            p.literalBrackets === !1 || e.hasRegexChars(yT))
          )
            continue;
          let uT = e.escapeRegex(aT.value);
          if (
            ((Q.output = Q.output.slice(0, -aT.value.length)),
            p.literalBrackets === !0)
          ) {
            ((Q.output += uT), (aT.value = uT));
            continue;
          }
          ((aT.value = `(${u}${uT}|${aT.value})`), (Q.output += aT.value));
          continue;
        }
        if (oT === "{" && p.nobrace !== !0) {
          U("braces");
          let yT = {
            type: "brace",
            value: oT,
            output: "(",
            outputIndex: Q.output.length,
            tokensIndex: Q.tokens.length,
          };
          (eT.push(yT), X(yT));
          continue;
        }
        if (oT === "}") {
          let yT = eT[eT.length - 1];
          if (p.nobrace === !0 || !yT) {
            X({ type: "text", value: oT, output: oT });
            continue;
          }
          let uT = ")";
          if (yT.dots === !0) {
            let bT = y.slice(),
              jT = [];
            for (let fT = bT.length - 1; fT >= 0; fT--) {
              if ((y.pop(), bT[fT].type === "brace")) break;
              if (bT[fT].type !== "dots") jT.unshift(bT[fT].value);
            }
            ((uT = s(jT, p)), (Q.backtrack = !0));
          }
          if (yT.comma !== !0 && yT.dots !== !0) {
            let bT = Q.output.slice(0, yT.outputIndex),
              jT = Q.tokens.slice(yT.tokensIndex);
            ((yT.value = yT.output = "\\{"),
              (oT = uT = "\\}"),
              (Q.output = bT));
            for (let fT of jT) Q.output += fT.output || fT.value;
          }
          (X({ type: "brace", value: oT, output: uT }), Z("braces"), eT.pop());
          continue;
        }
        if (oT === "|") {
          if (W.length > 0) W[W.length - 1].conditions++;
          X({ type: "text", value: oT });
          continue;
        }
        if (oT === ",") {
          let yT = oT,
            uT = eT[eT.length - 1];
          if (uT && iT[iT.length - 1] === "braces")
            ((uT.comma = !0), (yT = "|"));
          X({ type: "comma", value: oT, output: yT });
          continue;
        }
        if (oT === "/") {
          if (aT.type === "dot" && Q.index === Q.start + 1) {
            ((Q.start = Q.index + 1),
              (Q.consumed = ""),
              (Q.output = ""),
              y.pop(),
              (aT = b));
            continue;
          }
          X({ type: "slash", value: oT, output: v });
          continue;
        }
        if (oT === ".") {
          if (Q.braces > 0 && aT.type === "dot") {
            if (aT.value === ".") aT.output = x;
            let yT = eT[eT.length - 1];
            ((aT.type = "dots"),
              (aT.output += oT),
              (aT.value += oT),
              (yT.dots = !0));
            continue;
          }
          if (
            Q.braces + Q.parens === 0 &&
            aT.type !== "bos" &&
            aT.type !== "slash"
          ) {
            X({ type: "text", value: oT, output: x });
            continue;
          }
          X({ type: "dot", value: oT, output: x });
          continue;
        }
        if (oT === "?") {
          if (
            !(aT && aT.value === "(") &&
            p.noextglob !== !0 &&
            tT() === "(" &&
            tT(2) !== "?"
          ) {
            rT("qmark", oT);
            continue;
          }
          if (aT && aT.type === "paren") {
            let yT = tT(),
              uT = oT;
            if (
              (aT.value === "(" && !/[!=<:]/.test(yT)) ||
              (yT === "<" && !/<([!=]|\w+>)/.test(N()))
            )
              uT = `\\${oT}`;
            X({ type: "text", value: oT, output: uT });
            continue;
          }
          if (p.dot !== !0 && (aT.type === "slash" || aT.type === "bos")) {
            X({ type: "qmark", value: oT, output: C });
            continue;
          }
          X({ type: "qmark", value: oT, output: d });
          continue;
        }
        if (oT === "!") {
          if (p.noextglob !== !0 && tT() === "(") {
            if (tT(2) !== "?" || !/[!=<:]/.test(tT(3))) {
              rT("negate", oT);
              continue;
            }
          }
          if (p.nonegate !== !0 && Q.index === 0) {
            E();
            continue;
          }
        }
        if (oT === "+") {
          if (p.noextglob !== !0 && tT() === "(" && tT(2) !== "?") {
            rT("plus", oT);
            continue;
          }
          if ((aT && aT.value === "(") || p.regex === !1) {
            X({ type: "plus", value: oT, output: f });
            continue;
          }
          if (
            (aT &&
              (aT.type === "bracket" ||
                aT.type === "paren" ||
                aT.type === "brace")) ||
            Q.parens > 0
          ) {
            X({ type: "plus", value: oT });
            continue;
          }
          X({ type: "plus", value: f });
          continue;
        }
        if (oT === "@") {
          if (p.noextglob !== !0 && tT() === "(" && tT(2) !== "?") {
            X({ type: "at", extglob: !0, value: oT, output: "" });
            continue;
          }
          X({ type: "text", value: oT });
          continue;
        }
        if (oT !== "*") {
          if (oT === "$" || oT === "^") oT = `\\${oT}`;
          let yT = h.exec(N());
          if (yT) ((oT += yT[0]), (Q.index += yT[0].length));
          X({ type: "text", value: oT });
          continue;
        }
        if (aT && (aT.type === "globstar" || aT.star === !0)) {
          ((aT.type = "star"),
            (aT.star = !0),
            (aT.value += oT),
            (aT.output = V),
            (Q.backtrack = !0),
            (Q.globstar = !0),
            q(oT));
          continue;
        }
        let pT = N();
        if (p.noextglob !== !0 && /^\([^?]/.test(pT)) {
          rT("star", oT);
          continue;
        }
        if (aT.type === "star") {
          if (p.noglobstar === !0) {
            q(oT);
            continue;
          }
          let yT = aT.prev,
            uT = yT.prev,
            bT = yT.type === "slash" || yT.type === "bos",
            jT = uT && (uT.type === "star" || uT.type === "globstar");
          if (p.bash === !0 && (!bT || (pT[0] && pT[0] !== "/"))) {
            X({ type: "star", value: oT, output: "" });
            continue;
          }
          let fT = Q.braces > 0 && (yT.type === "comma" || yT.type === "brace"),
            MT = W.length && (yT.type === "pipe" || yT.type === "paren");
          if (!bT && yT.type !== "paren" && !fT && !MT) {
            X({ type: "star", value: oT, output: "" });
            continue;
          }
          while (pT.slice(0, 3) === "/**") {
            let UT = o[Q.index + 4];
            if (UT && UT !== "/") break;
            ((pT = pT.slice(3)), q("/**", 3));
          }
          if (yT.type === "bos" && TT()) {
            ((aT.type = "globstar"),
              (aT.value += oT),
              (aT.output = D(p)),
              (Q.output = aT.output),
              (Q.globstar = !0),
              q(oT));
            continue;
          }
          if (yT.type === "slash" && yT.prev.type !== "bos" && !jT && TT()) {
            ((Q.output = Q.output.slice(0, -(yT.output + aT.output).length)),
              (yT.output = `(?:${yT.output}`),
              (aT.type = "globstar"),
              (aT.output = D(p) + (p.strictSlashes ? ")" : "|$)")),
              (aT.value += oT),
              (Q.globstar = !0),
              (Q.output += yT.output + aT.output),
              q(oT));
            continue;
          }
          if (yT.type === "slash" && yT.prev.type !== "bos" && pT[0] === "/") {
            let UT = pT[1] !== void 0 ? "|$" : "";
            ((Q.output = Q.output.slice(0, -(yT.output + aT.output).length)),
              (yT.output = `(?:${yT.output}`),
              (aT.type = "globstar"),
              (aT.output = `${D(p)}${v}|${v}${UT})`),
              (aT.value += oT),
              (Q.output += yT.output + aT.output),
              (Q.globstar = !0),
              q(oT + lT()),
              X({ type: "slash", value: "/", output: "" }));
            continue;
          }
          if (yT.type === "bos" && pT[0] === "/") {
            ((aT.type = "globstar"),
              (aT.value += oT),
              (aT.output = `(?:^|${v}|${D(p)}${v})`),
              (Q.output = aT.output),
              (Q.globstar = !0),
              q(oT + lT()),
              X({ type: "slash", value: "/", output: "" }));
            continue;
          }
          ((Q.output = Q.output.slice(0, -aT.output.length)),
            (aT.type = "globstar"),
            (aT.output = D(p)),
            (aT.value += oT),
            (Q.output += aT.output),
            (Q.globstar = !0),
            q(oT));
          continue;
        }
        let mT = { type: "star", value: oT, output: V };
        if (p.bash === !0) {
          if (((mT.output = ".*?"), aT.type === "bos" || aT.type === "slash"))
            mT.output = B + mT.output;
          X(mT);
          continue;
        }
        if (
          aT &&
          (aT.type === "bracket" || aT.type === "paren") &&
          p.regex === !0
        ) {
          ((mT.output = oT), X(mT));
          continue;
        }
        if (Q.index === Q.start || aT.type === "slash" || aT.type === "dot") {
          if (aT.type === "dot") ((Q.output += O), (aT.output += O));
          else if (p.dot === !0) ((Q.output += j), (aT.output += j));
          else ((Q.output += B), (aT.output += B));
          if (tT() !== "*") ((Q.output += g), (aT.output += g));
        }
        X(mT);
      }
      while (Q.brackets > 0) {
        if (p.strictBrackets === !0) throw SyntaxError(A("closing", "]"));
        ((Q.output = e.escapeLast(Q.output, "[")), Z("brackets"));
      }
      while (Q.parens > 0) {
        if (p.strictBrackets === !0) throw SyntaxError(A("closing", ")"));
        ((Q.output = e.escapeLast(Q.output, "(")), Z("parens"));
      }
      while (Q.braces > 0) {
        if (p.strictBrackets === !0) throw SyntaxError(A("closing", "}"));
        ((Q.output = e.escapeLast(Q.output, "{")), Z("braces"));
      }
      if (
        p.strictSlashes !== !0 &&
        (aT.type === "star" || aT.type === "bracket")
      )
        X({ type: "maybe_slash", value: "", output: `${v}?` });
      if (Q.backtrack === !0) {
        Q.output = "";
        for (let pT of Q.tokens)
          if (
            ((Q.output += pT.output != null ? pT.output : pT.value), pT.suffix)
          )
            Q.output += pT.suffix;
      }
      return Q;
    };
  ((l.fastpaths = (o, n) => {
    let p = { ...n },
      _ = typeof p.maxLength === "number" ? Math.min(t, p.maxLength) : t,
      m = o.length;
    if (m > _)
      throw SyntaxError(
        `Input length: ${m}, exceeds maximum allowed length: ${_}`,
      );
    o = c[o] || o;
    let {
        DOT_LITERAL: b,
        SLASH_LITERAL: y,
        ONE_CHAR: u,
        DOTS_SLASH: P,
        NO_DOT: k,
        NO_DOTS: x,
        NO_DOTS_SLASH: f,
        STAR: v,
        START_ANCHOR: g,
      } = a.globChars(p.windows),
      I = p.dot ? x : k,
      S = p.dot ? f : k,
      O = p.capture ? "" : "?:",
      j = { negated: !1, prefix: "" },
      d = p.bash === !0 ? ".*?" : v;
    if (p.capture) d = `(${d})`;
    let C = (B) => {
        if (B.noglobstar === !0) return d;
        return `(${O}(?:(?!${g}${B.dot ? P : b}).)*?)`;
      },
      L = (B) => {
        switch (B) {
          case "*":
            return `${I}${u}${d}`;
          case ".*":
            return `${b}${u}${d}`;
          case "*.*":
            return `${I}${d}${b}${u}${d}`;
          case "*/*":
            return `${I}${d}${y}${u}${S}${d}`;
          case "**":
            return I + C(p);
          case "**/*":
            return `(?:${I}${C(p)}${y})?${S}${u}${d}`;
          case "**/*.*":
            return `(?:${I}${C(p)}${y})?${S}${d}${b}${u}${d}`;
          case "**/.*":
            return `(?:${I}${C(p)}${y})?${b}${u}${d}`;
          default: {
            let M = /^(.*?)\.(\w+)$/.exec(B);
            if (!M) return;
            let V = L(M[1]);
            if (!V) return;
            return V + b + M[2];
          }
        }
      },
      w = e.removePrefix(o, j),
      D = L(w);
    if (D && p.strictSlashes !== !0) D += `${y}?`;
    return D;
  }),
    (R.exports = l));
};
