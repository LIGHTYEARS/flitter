class LJT {
  rootElement;
  constructor(T) {
    this.rootElement = T;
  }
  updateRoot(T) {
    this.rootElement = T;
  }
  tree(T = 100) {
    return this.formatTree(this.rootElement, 0, T);
  }
  find(T) {
    let R = [];
    return this.walkTree(this.rootElement, a => {
      if (T(a)) R.push(a);
    }), R;
  }
  findByType(T) {
    let R = T.toLowerCase();
    return this.find(a => a.widget.constructor.name.toLowerCase().includes(R));
  }
  getFirstByType(T) {
    return this.findByType(T)[0] ?? null;
  }
  getState(T) {
    if ("state" in T) return T.state ?? null;
    return null;
  }
  getStateOf(T) {
    let R = this.getFirstByType(T);
    if (R) return this.getState(R);
    return null;
  }
  props(T) {
    let R = T.widget,
      a = {},
      e = Object.getOwnPropertyNames(R);
    for (let t of e) if (!t.startsWith("_") && t !== "constructor" && t !== "key") try {
      let r = R[t];
      if (typeof r !== "function") a[t] = r;
    } catch {}
    return a;
  }
  summary() {
    let T = {},
      R = 0,
      a = 0,
      e = 0;
    return this.walkTree(this.rootElement, t => {
      R++;
      let r = t.widget.constructor.name;
      if (T[r] = (T[r] ?? 0) + 1, "state" in t) a++;
      if (t.dirty) e++;
    }), {
      totalCount: R,
      countByType: T,
      statefulCount: a,
      dirtyCount: e
    };
  }
  focused() {
    let T = null;
    return this.walkTree(this.rootElement, R => {
      if ("focusNode" in R.widget) {
        let a = R.widget.focusNode;
        if (a && a.hasFocus) T = R;
      }
    }), T;
  }
  formatTree(T, R, a) {
    if (R > a) return "  ".repeat(R) + `...
`;
    let e = "  ".repeat(R),
      t = T.widget.constructor.name,
      r = "state" in T ? " [S]" : "",
      h = T.dirty ? " [dirty]" : "",
      i = `${e}${t}${r}${h}
`;
    for (let c of T.children) i += this.formatTree(c, R + 1, a);
    return i;
  }
  walkTree(T, R) {
    R(T);
    for (let a of T.children) this.walkTree(a, R);
  }
}