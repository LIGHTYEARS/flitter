function p5R(T, R) {
  if (typeof R === "object" && "toolbox" in R) return T;
  if (typeof R === "object" && "mcp" in R) return T;
  return T;
}
class izT {
  matchers;
  constructor(T) {
    this.matchers = T.map(R => {
      if (R === "") return () => !1;
      if (R === "*") return () => !0;
      if (/[*?[{]/.test(R)) try {
        let a = A5R.default(R, {
          dot: !0
        });
        return e => a(e);
      } catch {
        return a => a === R;
      }
      return a => a === R;
    });
  }
  matches(T) {
    return this.matchers.some(R => R(T));
  }
}