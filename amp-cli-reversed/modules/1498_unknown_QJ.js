function Hf(T, R) {
  return new RegExp(`^[A-Za-z0-9+/]{${T}}${R}$`);
}
function Wf(T) {
  return new RegExp(`^[A-Za-z0-9_-]{${T}}$`);
}
function whT(T, R, a) {
  if (T.issues.length) R.issues.push(...cc(a, T.issues));
}
class QJ {
  constructor(T = []) {
    if (this.content = [], this.indent = 0, this) this.args = T;
  }
  indented(T) {
    this.indent += 1, T(this), this.indent -= 1;
  }
  write(T) {
    if (typeof T === "function") {
      T(this, {
        execution: "sync"
      }), T(this, {
        execution: "async"
      });
      return;
    }
    let R = T.split(`
`).filter(t => t),
      a = Math.min(...R.map(t => t.length - t.trimStart().length)),
      e = R.map(t => t.slice(a)).map(t => " ".repeat(this.indent * 2) + t);
    for (let t of e) this.content.push(t);
  }
  compile() {
    let T = Function,
      R = this?.args,
      a = [...(this?.content ?? [""]).map(e => `  ${e}`)];
    return new T(...R, a.join(`
`));
  }
}