// Module: grpc-parser
// Original: KDT
// Type: CJS (RT wrapper)
// Exports: Parser
// Category: npm-pkg

// Module: KDT (CJS)
(T) => {
  var R = qT("process"),
    a = V9T(),
    e = FDT();
  function t(l, o) {
    for (let n = 0; n < l.length; ++n) if (l[n].type === o) return !0;
    return !1;
  }
  function r(l) {
    for (let o = 0; o < l.length; ++o)
      switch (l[o].type) {
        case "space":
        case "comment":
        case "newline":
          break;
        default:
          return o;
      }
    return -1;
  }
  function h(l) {
    switch (l?.type) {
      case "alias":
      case "scalar":
      case "single-quoted-scalar":
      case "double-quoted-scalar":
      case "flow-collection":
        return !0;
      default:
        return !1;
    }
  }
  function i(l) {
    switch (l.type) {
      case "document":
        return l.start;
      case "block-map": {
        let o = l.items[l.items.length - 1];
        return o.sep ?? o.start;
      }
      case "block-seq":
        return l.items[l.items.length - 1].start;
      default:
        return [];
    }
  }
  function c(l) {
    if (l.length === 0) return [];
    let o = l.length;
    T: while (--o >= 0)
      switch (l[o].type) {
        case "doc-start":
        case "explicit-key-ind":
        case "map-value-ind":
        case "seq-item-ind":
        case "newline":
          break T;
      }
    while (l[++o]?.type === "space");
    return l.splice(o, l.length);
  }
  function s(l) {
    if (l.start.type === "flow-seq-start") {
      for (let o of l.items)
        if (
          o.sep &&
          !o.value &&
          !t(o.start, "explicit-key-ind") &&
          !t(o.sep, "map-value-ind")
        ) {
          if (o.key) o.value = o.key;
          if ((delete o.key, h(o.value)))
            if (o.value.end) Array.prototype.push.apply(o.value.end, o.sep);
            else o.value.end = o.sep;
          else Array.prototype.push.apply(o.start, o.sep);
          delete o.sep;
        }
    }
  }
  class A {
    constructor(l) {
      ((this.atNewLine = !0),
        (this.atScalar = !1),
        (this.indent = 0),
        (this.offset = 0),
        (this.onKeyLine = !1),
        (this.stack = []),
        (this.source = ""),
        (this.type = ""),
        (this.lexer = new e.Lexer()),
        (this.onNewLine = l));
    }
    *parse(l, o = !1) {
      if (this.onNewLine && this.offset === 0) this.onNewLine(0);
      for (let n of this.lexer.lex(l, o)) yield* this.next(n);
      if (!o) yield* this.end();
    }
    *next(l) {
      if (((this.source = l), R.env.LOG_TOKENS))
        console.log("|", a.prettyToken(l));
      if (this.atScalar) {
        ((this.atScalar = !1), yield* this.step(), (this.offset += l.length));
        return;
      }
      let o = a.tokenType(l);
      if (!o) {
        let n = `Not a YAML token: ${l}`;
        (yield* this.pop({
          type: "error",
          offset: this.offset,
          message: n,
          source: l,
        }),
          (this.offset += l.length));
      } else if (o === "scalar")
        ((this.atNewLine = !1), (this.atScalar = !0), (this.type = "scalar"));
      else {
        switch (((this.type = o), yield* this.step(), o)) {
          case "newline":
            if (((this.atNewLine = !0), (this.indent = 0), this.onNewLine))
              this.onNewLine(this.offset + l.length);
            break;
          case "space":
            if (this.atNewLine && l[0] === " ") this.indent += l.length;
            break;
          case "explicit-key-ind":
          case "map-value-ind":
          case "seq-item-ind":
            if (this.atNewLine) this.indent += l.length;
            break;
          case "doc-mode":
          case "flow-error-end":
            return;
          default:
            this.atNewLine = !1;
        }
        this.offset += l.length;
      }
    }
    *end() {
      while (this.stack.length > 0) yield* this.pop();
    }
    get sourceToken() {
      return {
        type: this.type,
        offset: this.offset,
        indent: this.indent,
        source: this.source,
      };
    }
    *step() {
      let l = this.peek(1);
      if (this.type === "doc-end" && l?.type !== "doc-end") {
        while (this.stack.length > 0) yield* this.pop();
        this.stack.push({
          type: "doc-end",
          offset: this.offset,
          source: this.source,
        });
        return;
      }
      if (!l) return yield* this.stream();
      switch (l.type) {
        case "document":
          return yield* this.document(l);
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
          return yield* this.scalar(l);
        case "block-scalar":
          return yield* this.blockScalar(l);
        case "block-map":
          return yield* this.blockMap(l);
        case "block-seq":
          return yield* this.blockSequence(l);
        case "flow-collection":
          return yield* this.flowCollection(l);
        case "doc-end":
          return yield* this.documentEnd(l);
      }
      yield* this.pop();
    }
    peek(l) {
      return this.stack[this.stack.length - l];
    }
    *pop(l) {
      let o = l ?? this.stack.pop();
      if (!o)
        yield {
          type: "error",
          offset: this.offset,
          source: "",
          message: "Tried to pop an empty stack",
        };
      else if (this.stack.length === 0) yield o;
      else {
        let n = this.peek(1);
        if (o.type === "block-scalar") o.indent = "indent" in n ? n.indent : 0;
        else if (o.type === "flow-collection" && n.type === "document")
          o.indent = 0;
        if (o.type === "flow-collection") s(o);
        switch (n.type) {
          case "document":
            n.value = o;
            break;
          case "block-scalar":
            n.props.push(o);
            break;
          case "block-map": {
            let p = n.items[n.items.length - 1];
            if (p.value) {
              (n.items.push({ start: [], key: o, sep: [] }),
                (this.onKeyLine = !0));
              return;
            } else if (p.sep) p.value = o;
            else {
              (Object.assign(p, { key: o, sep: [] }),
                (this.onKeyLine = !p.explicitKey));
              return;
            }
            break;
          }
          case "block-seq": {
            let p = n.items[n.items.length - 1];
            if (p.value) n.items.push({ start: [], value: o });
            else p.value = o;
            break;
          }
          case "flow-collection": {
            let p = n.items[n.items.length - 1];
            if (!p || p.value) n.items.push({ start: [], key: o, sep: [] });
            else if (p.sep) p.value = o;
            else Object.assign(p, { key: o, sep: [] });
            return;
          }
          default:
            (yield* this.pop(), yield* this.pop(o));
        }
        if (
          (n.type === "document" ||
            n.type === "block-map" ||
            n.type === "block-seq") &&
          (o.type === "block-map" || o.type === "block-seq")
        ) {
          let p = o.items[o.items.length - 1];
          if (
            p &&
            !p.sep &&
            !p.value &&
            p.start.length > 0 &&
            r(p.start) === -1 &&
            (o.indent === 0 ||
              p.start.every((_) => _.type !== "comment" || _.indent < o.indent))
          ) {
            if (n.type === "document") n.end = p.start;
            else n.items.push({ start: p.start });
            o.items.splice(-1, 1);
          }
        }
      }
    }
    *stream() {
      switch (this.type) {
        case "directive-line":
          yield { type: "directive", offset: this.offset, source: this.source };
          return;
        case "byte-order-mark":
        case "space":
        case "comment":
        case "newline":
          yield this.sourceToken;
          return;
        case "doc-mode":
        case "doc-start": {
          let l = { type: "document", offset: this.offset, start: [] };
          if (this.type === "doc-start") l.start.push(this.sourceToken);
          this.stack.push(l);
          return;
        }
      }
      yield {
        type: "error",
        offset: this.offset,
        message: `Unexpected ${this.type} token in YAML stream`,
        source: this.source,
      };
    }
    *document(l) {
      if (l.value) return yield* this.lineEnd(l);
      switch (this.type) {
        case "doc-start": {
          if (r(l.start) !== -1) (yield* this.pop(), yield* this.step());
          else l.start.push(this.sourceToken);
          return;
        }
        case "anchor":
        case "tag":
        case "space":
        case "comment":
        case "newline":
          l.start.push(this.sourceToken);
          return;
      }
      let o = this.startBlockValue(l);
      if (o) this.stack.push(o);
      else
        yield {
          type: "error",
          offset: this.offset,
          message: `Unexpected ${this.type} token in YAML document`,
          source: this.source,
        };
    }
    *scalar(l) {
      if (this.type === "map-value-ind") {
        let o = i(this.peek(2)),
          n = c(o),
          p;
        if (l.end) ((p = l.end), p.push(this.sourceToken), delete l.end);
        else p = [this.sourceToken];
        let _ = {
          type: "block-map",
          offset: l.offset,
          indent: l.indent,
          items: [{ start: n, key: l, sep: p }],
        };
        ((this.onKeyLine = !0), (this.stack[this.stack.length - 1] = _));
      } else yield* this.lineEnd(l);
    }
    *blockScalar(l) {
      switch (this.type) {
        case "space":
        case "comment":
        case "newline":
          l.props.push(this.sourceToken);
          return;
        case "scalar":
          if (
            ((l.source = this.source),
            (this.atNewLine = !0),
            (this.indent = 0),
            this.onNewLine)
          ) {
            let o =
              this.source.indexOf(`
`) + 1;
            while (o !== 0)
              (this.onNewLine(this.offset + o),
                (o =
                  this.source.indexOf(
                    `
`,
                    o,
                  ) + 1));
          }
          yield* this.pop();
          break;
        default:
          (yield* this.pop(), yield* this.step());
      }
    }
    *blockMap(l) {
      let o = l.items[l.items.length - 1];
      switch (this.type) {
        case "newline":
          if (((this.onKeyLine = !1), o.value)) {
            let n = "end" in o.value ? o.value.end : void 0;
            if (
              (Array.isArray(n) ? n[n.length - 1] : void 0)?.type === "comment"
            )
              n?.push(this.sourceToken);
            else l.items.push({ start: [this.sourceToken] });
          } else if (o.sep) o.sep.push(this.sourceToken);
          else o.start.push(this.sourceToken);
          return;
        case "space":
        case "comment":
          if (o.value) l.items.push({ start: [this.sourceToken] });
          else if (o.sep) o.sep.push(this.sourceToken);
          else {
            if (this.atIndentedComment(o.start, l.indent)) {
              let n = l.items[l.items.length - 2]?.value?.end;
              if (Array.isArray(n)) {
                (Array.prototype.push.apply(n, o.start),
                  n.push(this.sourceToken),
                  l.items.pop());
                return;
              }
            }
            o.start.push(this.sourceToken);
          }
          return;
      }
      if (this.indent >= l.indent) {
        let n = !this.onKeyLine && this.indent === l.indent,
          p = n && (o.sep || o.explicitKey) && this.type !== "seq-item-ind",
          _ = [];
        if (p && o.sep && !o.value) {
          let m = [];
          for (let b = 0; b < o.sep.length; ++b) {
            let y = o.sep[b];
            switch (y.type) {
              case "newline":
                m.push(b);
                break;
              case "space":
                break;
              case "comment":
                if (y.indent > l.indent) m.length = 0;
                break;
              default:
                m.length = 0;
            }
          }
          if (m.length >= 2) _ = o.sep.splice(m[1]);
        }
        switch (this.type) {
          case "anchor":
          case "tag":
            if (p || o.value)
              (_.push(this.sourceToken),
                l.items.push({ start: _ }),
                (this.onKeyLine = !0));
            else if (o.sep) o.sep.push(this.sourceToken);
            else o.start.push(this.sourceToken);
            return;
          case "explicit-key-ind":
            if (!o.sep && !o.explicitKey)
              (o.start.push(this.sourceToken), (o.explicitKey = !0));
            else if (p || o.value)
              (_.push(this.sourceToken),
                l.items.push({ start: _, explicitKey: !0 }));
            else
              this.stack.push({
                type: "block-map",
                offset: this.offset,
                indent: this.indent,
                items: [{ start: [this.sourceToken], explicitKey: !0 }],
              });
            this.onKeyLine = !0;
            return;
          case "map-value-ind":
            if (o.explicitKey)
              if (!o.sep)
                if (t(o.start, "newline"))
                  Object.assign(o, { key: null, sep: [this.sourceToken] });
                else {
                  let m = c(o.start);
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: m, key: null, sep: [this.sourceToken] }],
                  });
                }
              else if (o.value)
                l.items.push({ start: [], key: null, sep: [this.sourceToken] });
              else if (t(o.sep, "map-value-ind"))
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: _, key: null, sep: [this.sourceToken] }],
                });
              else if (h(o.key) && !t(o.sep, "newline")) {
                let m = c(o.start),
                  b = o.key,
                  y = o.sep;
                (y.push(this.sourceToken),
                  delete o.key,
                  delete o.sep,
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: m, key: b, sep: y }],
                  }));
              } else if (_.length > 0)
                o.sep = o.sep.concat(_, this.sourceToken);
              else o.sep.push(this.sourceToken);
            else if (!o.sep)
              Object.assign(o, { key: null, sep: [this.sourceToken] });
            else if (o.value || p)
              l.items.push({ start: _, key: null, sep: [this.sourceToken] });
            else if (t(o.sep, "map-value-ind"))
              this.stack.push({
                type: "block-map",
                offset: this.offset,
                indent: this.indent,
                items: [{ start: [], key: null, sep: [this.sourceToken] }],
              });
            else o.sep.push(this.sourceToken);
            this.onKeyLine = !0;
            return;
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar": {
            let m = this.flowScalar(this.type);
            if (p || o.value)
              (l.items.push({ start: _, key: m, sep: [] }),
                (this.onKeyLine = !0));
            else if (o.sep) this.stack.push(m);
            else (Object.assign(o, { key: m, sep: [] }), (this.onKeyLine = !0));
            return;
          }
          default: {
            let m = this.startBlockValue(l);
            if (m) {
              if (m.type === "block-seq") {
                if (!o.explicitKey && o.sep && !t(o.sep, "newline")) {
                  yield* this.pop({
                    type: "error",
                    offset: this.offset,
                    message: "Unexpected block-seq-ind on same line with key",
                    source: this.source,
                  });
                  return;
                }
              } else if (n) l.items.push({ start: _ });
              this.stack.push(m);
              return;
            }
          }
        }
      }
      (yield* this.pop(), yield* this.step());
    }
    *blockSequence(l) {
      let o = l.items[l.items.length - 1];
      switch (this.type) {
        case "newline":
          if (o.value) {
            let n = "end" in o.value ? o.value.end : void 0;
            if (
              (Array.isArray(n) ? n[n.length - 1] : void 0)?.type === "comment"
            )
              n?.push(this.sourceToken);
            else l.items.push({ start: [this.sourceToken] });
          } else o.start.push(this.sourceToken);
          return;
        case "space":
        case "comment":
          if (o.value) l.items.push({ start: [this.sourceToken] });
          else {
            if (this.atIndentedComment(o.start, l.indent)) {
              let n = l.items[l.items.length - 2]?.value?.end;
              if (Array.isArray(n)) {
                (Array.prototype.push.apply(n, o.start),
                  n.push(this.sourceToken),
                  l.items.pop());
                return;
              }
            }
            o.start.push(this.sourceToken);
          }
          return;
        case "anchor":
        case "tag":
          if (o.value || this.indent <= l.indent) break;
          o.start.push(this.sourceToken);
          return;
        case "seq-item-ind":
          if (this.indent !== l.indent) break;
          if (o.value || t(o.start, "seq-item-ind"))
            l.items.push({ start: [this.sourceToken] });
          else o.start.push(this.sourceToken);
          return;
      }
      if (this.indent > l.indent) {
        let n = this.startBlockValue(l);
        if (n) {
          this.stack.push(n);
          return;
        }
      }
      (yield* this.pop(), yield* this.step());
    }
    *flowCollection(l) {
      let o = l.items[l.items.length - 1];
      if (this.type === "flow-error-end") {
        let n;
        do (yield* this.pop(), (n = this.peek(1)));
        while (n?.type === "flow-collection");
      } else if (l.end.length === 0) {
        switch (this.type) {
          case "comma":
          case "explicit-key-ind":
            if (!o || o.sep) l.items.push({ start: [this.sourceToken] });
            else o.start.push(this.sourceToken);
            return;
          case "map-value-ind":
            if (!o || o.value)
              l.items.push({ start: [], key: null, sep: [this.sourceToken] });
            else if (o.sep) o.sep.push(this.sourceToken);
            else Object.assign(o, { key: null, sep: [this.sourceToken] });
            return;
          case "space":
          case "comment":
          case "newline":
          case "anchor":
          case "tag":
            if (!o || o.value) l.items.push({ start: [this.sourceToken] });
            else if (o.sep) o.sep.push(this.sourceToken);
            else o.start.push(this.sourceToken);
            return;
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar": {
            let p = this.flowScalar(this.type);
            if (!o || o.value) l.items.push({ start: [], key: p, sep: [] });
            else if (o.sep) this.stack.push(p);
            else Object.assign(o, { key: p, sep: [] });
            return;
          }
          case "flow-map-end":
          case "flow-seq-end":
            l.end.push(this.sourceToken);
            return;
        }
        let n = this.startBlockValue(l);
        if (n) this.stack.push(n);
        else (yield* this.pop(), yield* this.step());
      } else {
        let n = this.peek(2);
        if (
          n.type === "block-map" &&
          ((this.type === "map-value-ind" && n.indent === l.indent) ||
            (this.type === "newline" && !n.items[n.items.length - 1].sep))
        )
          (yield* this.pop(), yield* this.step());
        else if (
          this.type === "map-value-ind" &&
          n.type !== "flow-collection"
        ) {
          let p = i(n),
            _ = c(p);
          s(l);
          let m = l.end.splice(1, l.end.length);
          m.push(this.sourceToken);
          let b = {
            type: "block-map",
            offset: l.offset,
            indent: l.indent,
            items: [{ start: _, key: l, sep: m }],
          };
          ((this.onKeyLine = !0), (this.stack[this.stack.length - 1] = b));
        } else yield* this.lineEnd(l);
      }
    }
    flowScalar(l) {
      if (this.onNewLine) {
        let o =
          this.source.indexOf(`
`) + 1;
        while (o !== 0)
          (this.onNewLine(this.offset + o),
            (o =
              this.source.indexOf(
                `
`,
                o,
              ) + 1));
      }
      return {
        type: l,
        offset: this.offset,
        indent: this.indent,
        source: this.source,
      };
    }
    startBlockValue(l) {
      switch (this.type) {
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
          return this.flowScalar(this.type);
        case "block-scalar-header":
          return {
            type: "block-scalar",
            offset: this.offset,
            indent: this.indent,
            props: [this.sourceToken],
            source: "",
          };
        case "flow-map-start":
        case "flow-seq-start":
          return {
            type: "flow-collection",
            offset: this.offset,
            indent: this.indent,
            start: this.sourceToken,
            items: [],
            end: [],
          };
        case "seq-item-ind":
          return {
            type: "block-seq",
            offset: this.offset,
            indent: this.indent,
            items: [{ start: [this.sourceToken] }],
          };
        case "explicit-key-ind": {
          this.onKeyLine = !0;
          let o = i(l),
            n = c(o);
          return (
            n.push(this.sourceToken),
            {
              type: "block-map",
              offset: this.offset,
              indent: this.indent,
              items: [{ start: n, explicitKey: !0 }],
            }
          );
        }
        case "map-value-ind": {
          this.onKeyLine = !0;
          let o = i(l),
            n = c(o);
          return {
            type: "block-map",
            offset: this.offset,
            indent: this.indent,
            items: [{ start: n, key: null, sep: [this.sourceToken] }],
          };
        }
      }
      return null;
    }
    atIndentedComment(l, o) {
      if (this.type !== "comment") return !1;
      if (this.indent <= o) return !1;
      return l.every((n) => n.type === "newline" || n.type === "space");
    }
    *documentEnd(l) {
      if (this.type !== "doc-mode") {
        if (l.end) l.end.push(this.sourceToken);
        else l.end = [this.sourceToken];
        if (this.type === "newline") yield* this.pop();
      }
    }
    *lineEnd(l) {
      switch (this.type) {
        case "comma":
        case "doc-start":
        case "doc-end":
        case "flow-seq-end":
        case "flow-map-end":
        case "map-value-ind":
          (yield* this.pop(), yield* this.step());
          break;
        case "newline":
          this.onKeyLine = !1;
        case "space":
        case "comment":
        default:
          if (l.end) l.end.push(this.sourceToken);
          else l.end = [this.sourceToken];
          if (this.type === "newline") yield* this.pop();
      }
    }
  }
  T.Parser = A;
};
