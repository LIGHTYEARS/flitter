function ZsT(T) {
  return {
    tool: T,
    action: "allow"
  };
}
function bbR(T) {
  if (!T || !("cmd" in T)) return T;
  let {
    cmd: R,
    ...a
  } = T;
  return {
    ...a,
    command: R
  };
}
function mbR(T) {
  return T.flatMap(R => {
    if (R.tool !== U8) return [];
    return [{
      ...R,
      tool: Eb,
      matches: bbR(R.matches)
    }];
  });
}
class bLT {
  input;
  position = 0;
  line = 1;
  column = 1;
  tokens = [];
  constructor(T) {
    this.input = T;
  }
  current() {
    return this.position < this.input.length ? this.input[this.position] : "";
  }
  peek() {
    return this.position + 1 < this.input.length ? this.input[this.position + 1] : "";
  }
  advance() {
    let T = this.current();
    if (this.position++, T === `
`) this.line++, this.column = 1;else this.column++;
    return T;
  }
  skipWhitespace() {
    while (this.current() && /\s/.test(this.current()) && this.current() !== `
`) this.advance();
  }
  readString() {
    let T = "",
      R = this.current();
    this.advance();
    while (this.current() && this.current() !== R) if (this.current() === "\\" && this.peek() === R) this.advance(), T += this.advance();else T += this.advance();
    if (!this.current()) throw Error("Unterminated string");
    return this.advance(), T;
  }
  readIdentifier() {
    let T = "";
    if (this.current() === "-" && /\d/.test(this.peek())) T += this.advance();
    while (this.current() && /[a-zA-Z0-9_*.-]/.test(this.current())) T += this.advance();
    if ((this.current() === "e" || this.current() === "E") && /[-+]?\d/.test(this.peek())) {
      if (T += this.advance(), this.current() === "+" || this.current() === "-") T += this.advance();
      while (this.current() && /\d/.test(this.current())) T += this.advance();
    }
    return T;
  }
  readFlag() {
    let T = "";
    this.advance(), this.advance();
    while (this.current() && /[a-zA-Z0-9_*:.-]/.test(this.current())) T += this.advance();
    return T;
  }
  readComment() {
    let T = "";
    this.advance();
    while (this.current() && this.current() !== `
`) T += this.advance();
    return T.trim();
  }
  tokenize() {
    this.tokens = [];
    while (this.position < this.input.length) {
      let T = {
        position: this.position,
        line: this.line,
        column: this.column
      };
      if (this.skipWhitespace(), !this.current()) break;
      if (this.current() === "'" || this.current() === '"') {
        try {
          let R = this.readString();
          this.tokens.push({
            type: "STRING",
            value: R,
            ...T
          });
        } catch (R) {
          throw Error(`Parse error at line ${this.line}, column ${this.column}: ${R}`);
        }
        continue;
      }
      if (this.current() === `
`) {
        this.advance();
        continue;
      }
      if (this.current() === "#") {
        let R = this.readComment();
        this.tokens.push({
          type: "COMMENT",
          value: R,
          ...T
        });
        continue;
      }
      if (this.current() === "-" && this.peek() === "-") {
        let R = this.readFlag();
        this.tokens.push({
          type: "FLAG",
          value: R,
          ...T
        });
        continue;
      }
      if (/[a-zA-Z0-9_*.-]/.test(this.current()) || this.current() === "-" && /\d/.test(this.peek())) {
        let R = this.readIdentifier();
        this.tokens.push({
          type: "IDENTIFIER",
          value: R,
          ...T
        });
        continue;
      }
      throw Error(`Unexpected character '${this.current()}' at line ${this.line}, column ${this.column}`);
    }
    return this.tokens.push({
      type: "EOF",
      value: "",
      position: this.position,
      line: this.line,
      column: this.column
    }), this.tokens;
  }
}