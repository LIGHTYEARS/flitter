// Module: lexer
// Original: FDT
// Type: CJS (RT wrapper)
// Exports: Lexer
// Category: util

// Module: FDT (CJS)
(T) => {
  var R = V9T();
  function a(s) {
    switch (s) {
      case void 0:
      case " ":
      case `
`:
      case "\r":
      case "\t":
        return !0;
      default:
        return !1;
    }
  }
  var e = new Set("0123456789ABCDEFabcdef"),
    t = new Set(
      "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()",
    ),
    r = new Set(",[]{}"),
    h = new Set(` ,[]{}
\r	`),
    i = (s) => !s || h.has(s);
  class c {
    constructor() {
      ((this.atEnd = !1),
        (this.blockScalarIndent = -1),
        (this.blockScalarKeep = !1),
        (this.buffer = ""),
        (this.flowKey = !1),
        (this.flowLevel = 0),
        (this.indentNext = 0),
        (this.indentValue = 0),
        (this.lineEndPos = null),
        (this.next = null),
        (this.pos = 0));
    }
    *lex(s, A = !1) {
      if (s) {
        if (typeof s !== "string") throw TypeError("source is not a string");
        ((this.buffer = this.buffer ? this.buffer + s : s),
          (this.lineEndPos = null));
      }
      this.atEnd = !A;
      let l = this.next ?? "stream";
      while (l && (A || this.hasChars(1))) l = yield* this.parseNext(l);
    }
    atLineEnd() {
      let s = this.pos,
        A = this.buffer[s];
      while (A === " " || A === "\t") A = this.buffer[++s];
      if (
        !A ||
        A === "#" ||
        A ===
          `
`
      )
        return !0;
      if (A === "\r")
        return (
          this.buffer[s + 1] ===
          `
`
        );
      return !1;
    }
    charAt(s) {
      return this.buffer[this.pos + s];
    }
    continueScalar(s) {
      let A = this.buffer[s];
      if (this.indentNext > 0) {
        let l = 0;
        while (A === " ") A = this.buffer[++l + s];
        if (A === "\r") {
          let o = this.buffer[l + s + 1];
          if (
            o ===
              `
` ||
            (!o && !this.atEnd)
          )
            return s + l + 1;
        }
        return A ===
          `
` ||
          l >= this.indentNext ||
          (!A && !this.atEnd)
          ? s + l
          : -1;
      }
      if (A === "-" || A === ".") {
        let l = this.buffer.substr(s, 3);
        if ((l === "---" || l === "...") && a(this.buffer[s + 3])) return -1;
      }
      return s;
    }
    getLine() {
      let s = this.lineEndPos;
      if (typeof s !== "number" || (s !== -1 && s < this.pos))
        ((s = this.buffer.indexOf(
          `
`,
          this.pos,
        )),
          (this.lineEndPos = s));
      if (s === -1) return this.atEnd ? this.buffer.substring(this.pos) : null;
      if (this.buffer[s - 1] === "\r") s -= 1;
      return this.buffer.substring(this.pos, s);
    }
    hasChars(s) {
      return this.pos + s <= this.buffer.length;
    }
    setNext(s) {
      return (
        (this.buffer = this.buffer.substring(this.pos)),
        (this.pos = 0),
        (this.lineEndPos = null),
        (this.next = s),
        null
      );
    }
    peek(s) {
      return this.buffer.substr(this.pos, s);
    }
    *parseNext(s) {
      switch (s) {
        case "stream":
          return yield* this.parseStream();
        case "line-start":
          return yield* this.parseLineStart();
        case "block-start":
          return yield* this.parseBlockStart();
        case "doc":
          return yield* this.parseDocument();
        case "flow":
          return yield* this.parseFlowCollection();
        case "quoted-scalar":
          return yield* this.parseQuotedScalar();
        case "block-scalar":
          return yield* this.parseBlockScalar();
        case "plain-scalar":
          return yield* this.parsePlainScalar();
      }
    }
    *parseStream() {
      let s = this.getLine();
      if (s === null) return this.setNext("stream");
      if (s[0] === R.BOM) (yield* this.pushCount(1), (s = s.substring(1)));
      if (s[0] === "%") {
        let A = s.length,
          l = s.indexOf("#");
        while (l !== -1) {
          let n = s[l - 1];
          if (n === " " || n === "\t") {
            A = l - 1;
            break;
          } else l = s.indexOf("#", l + 1);
        }
        while (!0) {
          let n = s[A - 1];
          if (n === " " || n === "\t") A -= 1;
          else break;
        }
        let o = (yield* this.pushCount(A)) + (yield* this.pushSpaces(!0));
        return (
          yield* this.pushCount(s.length - o),
          this.pushNewline(),
          "stream"
        );
      }
      if (this.atLineEnd()) {
        let A = yield* this.pushSpaces(!0);
        return (
          yield* this.pushCount(s.length - A),
          yield* this.pushNewline(),
          "stream"
        );
      }
      return (yield R.DOCUMENT, yield* this.parseLineStart());
    }
    *parseLineStart() {
      let s = this.charAt(0);
      if (!s && !this.atEnd) return this.setNext("line-start");
      if (s === "-" || s === ".") {
        if (!this.atEnd && !this.hasChars(4)) return this.setNext("line-start");
        let A = this.peek(3);
        if ((A === "---" || A === "...") && a(this.charAt(3)))
          return (
            yield* this.pushCount(3),
            (this.indentValue = 0),
            (this.indentNext = 0),
            A === "---" ? "doc" : "stream"
          );
      }
      if (
        ((this.indentValue = yield* this.pushSpaces(!1)),
        this.indentNext > this.indentValue && !a(this.charAt(1)))
      )
        this.indentNext = this.indentValue;
      return yield* this.parseBlockStart();
    }
    *parseBlockStart() {
      let [s, A] = this.peek(2);
      if (!A && !this.atEnd) return this.setNext("block-start");
      if ((s === "-" || s === "?" || s === ":") && a(A)) {
        let l = (yield* this.pushCount(1)) + (yield* this.pushSpaces(!0));
        return (
          (this.indentNext = this.indentValue + 1),
          (this.indentValue += l),
          yield* this.parseBlockStart()
        );
      }
      return "doc";
    }
    *parseDocument() {
      yield* this.pushSpaces(!0);
      let s = this.getLine();
      if (s === null) return this.setNext("doc");
      let A = yield* this.pushIndicators();
      switch (s[A]) {
        case "#":
          yield* this.pushCount(s.length - A);
        case void 0:
          return (yield* this.pushNewline(), yield* this.parseLineStart());
        case "{":
        case "[":
          return (
            yield* this.pushCount(1),
            (this.flowKey = !1),
            (this.flowLevel = 1),
            "flow"
          );
        case "}":
        case "]":
          return (yield* this.pushCount(1), "doc");
        case "*":
          return (yield* this.pushUntil(i), "doc");
        case '"':
        case "'":
          return yield* this.parseQuotedScalar();
        case "|":
        case ">":
          return (
            (A += yield* this.parseBlockScalarHeader()),
            (A += yield* this.pushSpaces(!0)),
            yield* this.pushCount(s.length - A),
            yield* this.pushNewline(),
            yield* this.parseBlockScalar()
          );
        default:
          return yield* this.parsePlainScalar();
      }
    }
    *parseFlowCollection() {
      let s,
        A,
        l = -1;
      do {
        if (((s = yield* this.pushNewline()), s > 0))
          ((A = yield* this.pushSpaces(!1)), (this.indentValue = l = A));
        else A = 0;
        A += yield* this.pushSpaces(!0);
      } while (s + A > 0);
      let o = this.getLine();
      if (o === null) return this.setNext("flow");
      if (
        (l !== -1 && l < this.indentNext && o[0] !== "#") ||
        (l === 0 && (o.startsWith("---") || o.startsWith("...")) && a(o[3]))
      ) {
        if (
          !(
            l === this.indentNext - 1 &&
            this.flowLevel === 1 &&
            (o[0] === "]" || o[0] === "}")
          )
        )
          return (
            (this.flowLevel = 0),
            yield R.FLOW_END,
            yield* this.parseLineStart()
          );
      }
      let n = 0;
      while (o[n] === ",")
        ((n += yield* this.pushCount(1)),
          (n += yield* this.pushSpaces(!0)),
          (this.flowKey = !1));
      switch (((n += yield* this.pushIndicators()), o[n])) {
        case void 0:
          return "flow";
        case "#":
          return (yield* this.pushCount(o.length - n), "flow");
        case "{":
        case "[":
          return (
            yield* this.pushCount(1),
            (this.flowKey = !1),
            (this.flowLevel += 1),
            "flow"
          );
        case "}":
        case "]":
          return (
            yield* this.pushCount(1),
            (this.flowKey = !0),
            (this.flowLevel -= 1),
            this.flowLevel ? "flow" : "doc"
          );
        case "*":
          return (yield* this.pushUntil(i), "flow");
        case '"':
        case "'":
          return ((this.flowKey = !0), yield* this.parseQuotedScalar());
        case ":": {
          let p = this.charAt(1);
          if (this.flowKey || a(p) || p === ",")
            return (
              (this.flowKey = !1),
              yield* this.pushCount(1),
              yield* this.pushSpaces(!0),
              "flow"
            );
        }
        default:
          return ((this.flowKey = !1), yield* this.parsePlainScalar());
      }
    }
    *parseQuotedScalar() {
      let s = this.charAt(0),
        A = this.buffer.indexOf(s, this.pos + 1);
      if (s === "'")
        while (A !== -1 && this.buffer[A + 1] === "'")
          A = this.buffer.indexOf("'", A + 2);
      else
        while (A !== -1) {
          let n = 0;
          while (this.buffer[A - 1 - n] === "\\") n += 1;
          if (n % 2 === 0) break;
          A = this.buffer.indexOf('"', A + 1);
        }
      let l = this.buffer.substring(0, A),
        o = l.indexOf(
          `
`,
          this.pos,
        );
      if (o !== -1) {
        while (o !== -1) {
          let n = this.continueScalar(o + 1);
          if (n === -1) break;
          o = l.indexOf(
            `
`,
            n,
          );
        }
        if (o !== -1) A = o - (l[o - 1] === "\r" ? 2 : 1);
      }
      if (A === -1) {
        if (!this.atEnd) return this.setNext("quoted-scalar");
        A = this.buffer.length;
      }
      return (
        yield* this.pushToIndex(A + 1, !1),
        this.flowLevel ? "flow" : "doc"
      );
    }
    *parseBlockScalarHeader() {
      ((this.blockScalarIndent = -1), (this.blockScalarKeep = !1));
      let s = this.pos;
      while (!0) {
        let A = this.buffer[++s];
        if (A === "+") this.blockScalarKeep = !0;
        else if (A > "0" && A <= "9") this.blockScalarIndent = Number(A) - 1;
        else if (A !== "-") break;
      }
      return yield* this.pushUntil((A) => a(A) || A === "#");
    }
    *parseBlockScalar() {
      let s = this.pos - 1,
        A = 0,
        l;
      T: for (let n = this.pos; (l = this.buffer[n]); ++n)
        switch (l) {
          case " ":
            A += 1;
            break;
          case `
`:
            ((s = n), (A = 0));
            break;
          case "\r": {
            let p = this.buffer[n + 1];
            if (!p && !this.atEnd) return this.setNext("block-scalar");
            if (
              p ===
              `
`
            )
              break;
          }
          default:
            break T;
        }
      if (!l && !this.atEnd) return this.setNext("block-scalar");
      if (A >= this.indentNext) {
        if (this.blockScalarIndent === -1) this.indentNext = A;
        else
          this.indentNext =
            this.blockScalarIndent +
            (this.indentNext === 0 ? 1 : this.indentNext);
        do {
          let n = this.continueScalar(s + 1);
          if (n === -1) break;
          s = this.buffer.indexOf(
            `
`,
            n,
          );
        } while (s !== -1);
        if (s === -1) {
          if (!this.atEnd) return this.setNext("block-scalar");
          s = this.buffer.length;
        }
      }
      let o = s + 1;
      l = this.buffer[o];
      while (l === " ") l = this.buffer[++o];
      if (l === "\t") {
        while (
          l === "\t" ||
          l === " " ||
          l === "\r" ||
          l ===
            `
`
        )
          l = this.buffer[++o];
        s = o - 1;
      } else if (!this.blockScalarKeep)
        do {
          let n = s - 1,
            p = this.buffer[n];
          if (p === "\r") p = this.buffer[--n];
          let _ = n;
          while (p === " ") p = this.buffer[--n];
          if (
            p ===
              `
` &&
            n >= this.pos &&
            n + 1 + A > _
          )
            s = n;
          else break;
        } while (!0);
      return (
        yield R.SCALAR,
        yield* this.pushToIndex(s + 1, !0),
        yield* this.parseLineStart()
      );
    }
    *parsePlainScalar() {
      let s = this.flowLevel > 0,
        A = this.pos - 1,
        l = this.pos - 1,
        o;
      while ((o = this.buffer[++l]))
        if (o === ":") {
          let n = this.buffer[l + 1];
          if (a(n) || (s && r.has(n))) break;
          A = l;
        } else if (a(o)) {
          let n = this.buffer[l + 1];
          if (o === "\r")
            if (
              n ===
              `
`
            )
              ((l += 1),
                (o = `
`),
                (n = this.buffer[l + 1]));
            else A = l;
          if (n === "#" || (s && r.has(n))) break;
          if (
            o ===
            `
`
          ) {
            let p = this.continueScalar(l + 1);
            if (p === -1) break;
            l = Math.max(l, p - 2);
          }
        } else {
          if (s && r.has(o)) break;
          A = l;
        }
      if (!o && !this.atEnd) return this.setNext("plain-scalar");
      return (
        yield R.SCALAR,
        yield* this.pushToIndex(A + 1, !0),
        s ? "flow" : "doc"
      );
    }
    *pushCount(s) {
      if (s > 0)
        return (yield this.buffer.substr(this.pos, s), (this.pos += s), s);
      return 0;
    }
    *pushToIndex(s, A) {
      let l = this.buffer.slice(this.pos, s);
      if (l) return (yield l, (this.pos += l.length), l.length);
      else if (A) yield "";
      return 0;
    }
    *pushIndicators() {
      switch (this.charAt(0)) {
        case "!":
          return (
            (yield* this.pushTag()) +
            (yield* this.pushSpaces(!0)) +
            (yield* this.pushIndicators())
          );
        case "&":
          return (
            (yield* this.pushUntil(i)) +
            (yield* this.pushSpaces(!0)) +
            (yield* this.pushIndicators())
          );
        case "-":
        case "?":
        case ":": {
          let s = this.flowLevel > 0,
            A = this.charAt(1);
          if (a(A) || (s && r.has(A))) {
            if (!s) this.indentNext = this.indentValue + 1;
            else if (this.flowKey) this.flowKey = !1;
            return (
              (yield* this.pushCount(1)) +
              (yield* this.pushSpaces(!0)) +
              (yield* this.pushIndicators())
            );
          }
        }
      }
      return 0;
    }
    *pushTag() {
      if (this.charAt(1) === "<") {
        let s = this.pos + 2,
          A = this.buffer[s];
        while (!a(A) && A !== ">") A = this.buffer[++s];
        return yield* this.pushToIndex(A === ">" ? s + 1 : s, !1);
      } else {
        let s = this.pos + 1,
          A = this.buffer[s];
        while (A)
          if (t.has(A)) A = this.buffer[++s];
          else if (
            A === "%" &&
            e.has(this.buffer[s + 1]) &&
            e.has(this.buffer[s + 2])
          )
            A = this.buffer[(s += 3)];
          else break;
        return yield* this.pushToIndex(s, !1);
      }
    }
    *pushNewline() {
      let s = this.buffer[this.pos];
      if (
        s ===
        `
`
      )
        return yield* this.pushCount(1);
      else if (
        s === "\r" &&
        this.charAt(1) ===
          `
`
      )
        return yield* this.pushCount(2);
      else return 0;
    }
    *pushSpaces(s) {
      let A = this.pos - 1,
        l;
      do l = this.buffer[++A];
      while (l === " " || (s && l === "\t"));
      let o = A - this.pos;
      if (o > 0) (yield this.buffer.substr(this.pos, o), (this.pos = A));
      return o;
    }
    *pushUntil(s) {
      let A = this.pos,
        l = this.buffer[A];
      while (!s(l)) l = this.buffer[++A];
      return yield* this.pushToIndex(A, !1);
    }
  }
  T.Lexer = c;
};
