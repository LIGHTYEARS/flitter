// Module: composer
// Original: zDT
// Type: CJS (RT wrapper)
// Exports: Composer
// Category: util

// Module: zDT (CJS)
(T) => {
  var R = qT("process"),
    a = vDT(),
    e = NN(),
    t = UN(),
    r = x8(),
    h = JPR(),
    i = pO();
  function c(l) {
    if (typeof l === "number") return [l, l + 1];
    if (Array.isArray(l)) return l.length === 2 ? l : [l[0], l[1]];
    let { offset: o, source: n } = l;
    return [o, o + (typeof n === "string" ? n.length : 1)];
  }
  function s(l) {
    let o = "",
      n = !1,
      p = !1;
    for (let _ = 0; _ < l.length; ++_) {
      let m = l[_];
      switch (m[0]) {
        case "#":
          ((o +=
            (o === ""
              ? ""
              : p
                ? `

`
                : `
`) + (m.substring(1) || " ")),
            (n = !0),
            (p = !1));
          break;
        case "%":
          if (l[_ + 1]?.[0] !== "#") _ += 1;
          n = !1;
          break;
        default:
          if (!n) p = !0;
          n = !1;
      }
    }
    return { comment: o, afterEmptyLine: p };
  }
  class A {
    constructor(l = {}) {
      ((this.doc = null),
        (this.atDirectives = !1),
        (this.prelude = []),
        (this.errors = []),
        (this.warnings = []),
        (this.onError = (o, n, p, _) => {
          let m = c(o);
          if (_) this.warnings.push(new t.YAMLWarning(m, n, p));
          else this.errors.push(new t.YAMLParseError(m, n, p));
        }),
        (this.directives = new a.Directives({ version: l.version || "1.2" })),
        (this.options = l));
    }
    decorate(l, o) {
      let { comment: n, afterEmptyLine: p } = s(this.prelude);
      if (n) {
        let _ = l.contents;
        if (o)
          l.comment = l.comment
            ? `${l.comment}
${n}`
            : n;
        else if (p || l.directives.docStart || !_) l.commentBefore = n;
        else if (r.isCollection(_) && !_.flow && _.items.length > 0) {
          let m = _.items[0];
          if (r.isPair(m)) m = m.key;
          let b = m.commentBefore;
          m.commentBefore = b
            ? `${n}
${b}`
            : n;
        } else {
          let m = _.commentBefore;
          _.commentBefore = m
            ? `${n}
${m}`
            : n;
        }
      }
      if (o)
        (Array.prototype.push.apply(l.errors, this.errors),
          Array.prototype.push.apply(l.warnings, this.warnings));
      else ((l.errors = this.errors), (l.warnings = this.warnings));
      ((this.prelude = []), (this.errors = []), (this.warnings = []));
    }
    streamInfo() {
      return {
        comment: s(this.prelude).comment,
        directives: this.directives,
        errors: this.errors,
        warnings: this.warnings,
      };
    }
    *compose(l, o = !1, n = -1) {
      for (let p of l) yield* this.next(p);
      yield* this.end(o, n);
    }
    *next(l) {
      if (R.env.LOG_STREAM) console.dir(l, { depth: null });
      switch (l.type) {
        case "directive":
          (this.directives.add(l.source, (o, n, p) => {
            let _ = c(l);
            ((_[0] += o), this.onError(_, "BAD_DIRECTIVE", n, p));
          }),
            this.prelude.push(l.source),
            (this.atDirectives = !0));
          break;
        case "document": {
          let o = h.composeDoc(this.options, this.directives, l, this.onError);
          if (this.atDirectives && !o.directives.docStart)
            this.onError(
              l,
              "MISSING_CHAR",
              "Missing directives-end/doc-start indicator line",
            );
          if ((this.decorate(o, !1), this.doc)) yield this.doc;
          ((this.doc = o), (this.atDirectives = !1));
          break;
        }
        case "byte-order-mark":
        case "space":
          break;
        case "comment":
        case "newline":
          this.prelude.push(l.source);
          break;
        case "error": {
          let o = l.source
              ? `${l.message}: ${JSON.stringify(l.source)}`
              : l.message,
            n = new t.YAMLParseError(c(l), "UNEXPECTED_TOKEN", o);
          if (this.atDirectives || !this.doc) this.errors.push(n);
          else this.doc.errors.push(n);
          break;
        }
        case "doc-end": {
          if (!this.doc) {
            this.errors.push(
              new t.YAMLParseError(
                c(l),
                "UNEXPECTED_TOKEN",
                "Unexpected doc-end without preceding document",
              ),
            );
            break;
          }
          this.doc.directives.docEnd = !0;
          let o = i.resolveEnd(
            l.end,
            l.offset + l.source.length,
            this.doc.options.strict,
            this.onError,
          );
          if ((this.decorate(this.doc, !0), o.comment)) {
            let n = this.doc.comment;
            this.doc.comment = n
              ? `${n}
${o.comment}`
              : o.comment;
          }
          this.doc.range[2] = o.offset;
          break;
        }
        default:
          this.errors.push(
            new t.YAMLParseError(
              c(l),
              "UNEXPECTED_TOKEN",
              `Unsupported token ${l.type}`,
            ),
          );
      }
    }
    *end(l = !1, o = -1) {
      if (this.doc)
        (this.decorate(this.doc, !0), yield this.doc, (this.doc = null));
      else if (l) {
        let n = Object.assign({ _directives: this.directives }, this.options),
          p = new e.Document(void 0, n);
        if (this.atDirectives)
          this.onError(
            o,
            "MISSING_CHAR",
            "Missing directives-end indicator line",
          );
        ((p.range = [0, o, o]), this.decorate(p, !1), yield p);
      }
    }
  }
  T.Composer = A;
};
