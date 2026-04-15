function ma(T, R, a) {
  return {
    err: {
      code: T,
      msg: R,
      line: a.line || a,
      col: a.col
    }
  };
}
function hw0(T) {
  return iW(T);
}
function iw0(T) {
  return iW(T);
}
function ft(T, R) {
  let a = T.substring(0, R).split(/\r?\n/);
  return {
    line: a.length,
    col: a[a.length - 1].length + 1
  };
}
function vg(T) {
  return T.startIndex + T[1].length;
}
class Hl {
  constructor(T) {
    this.tagname = T, this.child = [], this[":@"] = {};
  }
  add(T, R) {
    if (T === "__proto__") T = "#__proto__";
    this.child.push({
      [T]: R
    });
  }
  addChild(T, R) {
    if (T.tagname === "__proto__") T.tagname = "#__proto__";
    if (T[":@"] && Object.keys(T[":@"]).length > 0) this.child.push({
      [T.tagname]: T.child,
      [":@"]: T[":@"]
    });else this.child.push({
      [T.tagname]: T.child
    });
    if (R !== void 0) this.child[this.child.length - 1][_B] = {
      startIndex: R
    };
  }
  static getMetaDataSymbol() {
    return _B;
  }
}