function GY(T) {
  return OfT(T && T.line) + ":" + OfT(T && T.column);
}
function SfT(T) {
  return GY(T && T.start) + "-" + GY(T && T.end);
}
function OfT(T) {
  return T && typeof T === "number" ? T : 1;
}
function dfT(T) {
  return Boolean(T !== null && typeof T === "object" && "href" in T && T.href && "protocol" in T && T.protocol && T.auth === void 0);
}
class Jw {
  constructor(T) {
    let R;
    if (!T) R = {};else if (dfT(T)) R = {
      path: T
    };else if (typeof T === "string" || Hg0(T)) R = {
      value: T
    };else R = T;
    this.cwd = "cwd" in R ? "" : Ng0.cwd(), this.data = {}, this.history = [], this.messages = [], this.value, this.map, this.result, this.stored;
    let a = -1;
    while (++a < SF.length) {
      let t = SF[a];
      if (t in R && R[t] !== void 0 && R[t] !== null) this[t] = t === "history" ? [...R[t]] : R[t];
    }
    let e;
    for (e in R) if (!SF.includes(e)) this[e] = R[e];
  }
  get basename() {
    return typeof this.path === "string" ? os.basename(this.path) : void 0;
  }
  set basename(T) {
    dF(T, "basename"), OF(T, "basename"), this.path = os.join(this.dirname || "", T);
  }
  get dirname() {
    return typeof this.path === "string" ? os.dirname(this.path) : void 0;
  }
  set dirname(T) {
    EfT(this.basename, "dirname"), this.path = os.join(T || "", this.basename);
  }
  get extname() {
    return typeof this.path === "string" ? os.extname(this.path) : void 0;
  }
  set extname(T) {
    if (OF(T, "extname"), EfT(this.dirname, "extname"), T) {
      if (T.codePointAt(0) !== 46) throw Error("`extname` must start with `.`");
      if (T.includes(".", 1)) throw Error("`extname` cannot contain multiple dots");
    }
    this.path = os.join(this.dirname, this.stem + (T || ""));
  }
  get path() {
    return this.history[this.history.length - 1];
  }
  set path(T) {
    if (dfT(T)) T = Ug0(T);
    if (dF(T, "path"), this.path !== T) this.history.push(T);
  }
  get stem() {
    return typeof this.path === "string" ? os.basename(this.path, this.extname) : void 0;
  }
  set stem(T) {
    dF(T, "stem"), OF(T, "stem"), this.path = os.join(this.dirname || "", T + (this.extname || ""));
  }
  fail(T, R, a) {
    let e = this.message(T, R, a);
    throw e.fatal = !0, e;
  }
  info(T, R, a) {
    let e = this.message(T, R, a);
    return e.fatal = void 0, e;
  }
  message(T, R, a) {
    let e = new mt(T, R, a);
    if (this.path) e.name = this.path + ":" + e.name, e.file = this.path;
    return e.fatal = !1, this.messages.push(e), e;
  }
  toString(T) {
    if (this.value === void 0) return "";
    if (typeof this.value === "string") return this.value;
    return new TextDecoder(T || void 0).decode(this.value);
  }
}