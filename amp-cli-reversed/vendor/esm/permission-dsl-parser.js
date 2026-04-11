// Module: permission-dsl-parser
// Original: kN
// Type: ESM (PT wrapper)
// Exports: A, a, current, h, i, l, o, r, s, uLT
// Category: util

// Module: kN (ESM)
() => {
  uLT = class T {
    tokens;
    current = 0;
    constructor(R) {
      this.tokens = R;
    }
    currentToken() {
      return this.tokens[this.current] || this.tokens[this.tokens.length - 1];
    }
    check(R) {
      return this.currentToken().type === R;
    }
    advance() {
      if (!this.isAtEnd()) this.current++;
      return this.previous();
    }
    isAtEnd() {
      return this.currentToken().type === "EOF";
    }
    previous() {
      return this.tokens[this.current - 1];
    }
    consume(R, a) {
      if (this.check(R)) return this.advance();
      let e = this.currentToken();
      throw Error(`${a} at line ${e.line}, column ${e.column}`);
    }
    parseActionArgs() {
      let R = {};
      while (this.check("FLAG")) {
        let a = this.advance().value;
        if (this.check("IDENTIFIER") || this.check("STRING"))
          R[a] = this.advance().value;
        else {
          let e = this.currentToken();
          throw Error(
            `Expected value after --${a} at line ${e.line}, column ${e.column}`,
          );
        }
      }
      return R;
    }
    parseValue(R, a) {
      if (a) return R;
      if (R === "true") return !0;
      if (R === "false") return !1;
      if (R === "null") return null;
      if (this.isNumeric(R)) {
        let e = Number(R);
        if (!isNaN(e) && isFinite(e)) return e;
      }
      return R;
    }
    isNumeric(R) {
      return /^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(R);
    }
    static FORBIDDEN_PROPERTIES = new Set([
      "__proto__",
      "constructor",
      "prototype",
    ]);
    isSafePropertyName(R) {
      return !T.FORBIDDEN_PROPERTIES.has(R);
    }
    setNestedValue(R, a, e) {
      let t = a.split("."),
        r = R;
      for (let i = 0; i < t.length - 1; i++) {
        let c = t[i];
        if (!this.isSafePropertyName(c))
          throw Error(`Invalid property name '${c}' in path '${a}'`);
        if (!Object.hasOwn(r, c)) r[c] = {};
        r = r[c];
      }
      let h = t[t.length - 1];
      if (!this.isSafePropertyName(h))
        throw Error(`Invalid property name '${h}' in path '${a}'`);
      r[h] = e;
    }
    parseMatches() {
      let R = [],
        a = {};
      while (this.check("FLAG")) {
        let t = this.advance().value,
          r = t.split(":"),
          h = r[0],
          i = r[1];
        if (!this.check("IDENTIFIER") && !this.check("STRING")) {
          let n = this.currentToken();
          throw Error(
            `Expected value after --${t} at line ${n.line}, column ${n.column}`,
          );
        }
        let c = this.advance(),
          s = c.value,
          A = c.type === "STRING",
          l = this.parseValue(s, A),
          o;
        if (i) throw Error(`Unknown operator '${i}' in --${t}`);
        else {
          if (h.includes(".")) {
            R.push({ key: h, parsedValue: l, rawValue: s });
            continue;
          }
          if (!this.isSafePropertyName(h))
            throw Error(`Invalid property name '${h}'`);
          o = l;
        }
        if (Object.hasOwn(a, h)) {
          let n = a[h];
          if (Array.isArray(n)) n.push(s);
          else a[h] = [n, s];
        } else a[h] = o;
      }
      let e = new Map();
      for (let t of R) {
        let r = t.key.split(".")[0];
        if (!e.has(r)) e.set(r, []);
        e.get(r).push(t);
      }
      for (let [t, r] of e)
        if (this.shouldConvertToNestedStructure(r))
          for (let h of r) this.setNestedValue(a, h.key, h.parsedValue);
        else for (let h of r) a[h.key] = h.parsedValue;
      return a;
    }
    shouldConvertToNestedStructure(R) {
      return !0;
    }
    validateActionArgs(R, a, e) {
      let t = new Set();
      switch (R) {
        case "delegate":
          t.add("to");
          break;
        case "reject":
          t.add("message");
          break;
        case "allow":
        case "ask":
          break;
      }
      t.add("context");
      for (let r of Object.keys(a))
        if (!t.has(r)) {
          let h = Array.from(t).filter((i) => i !== "context");
          if (h.length === 0)
            throw Error(
              `${R} action does not support any specific arguments (only --context is allowed) at line ${e.line}, column ${e.column}`,
            );
          else
            throw Error(
              `${R} action only supports --${h.join(", --")} at line ${e.line}, column ${e.column}`,
            );
        }
    }
    parseEntry() {
      while (this.check("COMMENT")) this.advance();
      if (this.isAtEnd()) throw Error("Unexpected end of input");
      let R = this.consume(
          "IDENTIFIER",
          "Expected action (allow, reject, ask, delegate)",
        ),
        a = R.value;
      if (!["allow", "reject", "ask", "delegate"].includes(a))
        throw Error(
          `Invalid action '${a}' at line ${R.line}, column ${R.column}`,
        );
      let e = this.parseActionArgs();
      if (
        (this.validateActionArgs(a, e, R),
        !this.check("IDENTIFIER") && !this.check("STRING"))
      ) {
        let i = this.currentToken();
        throw Error(`Expected tool name at line ${i.line}, column ${i.column}`);
      }
      let t = this.advance().value,
        r = this.parseMatches(),
        h = { tool: t, action: a };
      if (Object.keys(r).length > 0) h.matches = r;
      if (a === "delegate") {
        if (!e.to)
          throw Error(
            `Delegate action requires --to argument at line ${R.line}, column ${R.column}`,
          );
        h.to = e.to;
      }
      if (a === "reject" && e.message) h.message = e.message;
      if (e.context) {
        if (!["thread", "subagent"].includes(e.context))
          throw Error(`Invalid context '${e.context}'`);
        h.context = e.context;
      }
      return h;
    }
  };
};
