async function T1T(T, R) {
  let a = d9.instance;
  if (R?.onRootElementMounted) a.setRootElementMountedCallback(R.onRootElementMounted);
  await a.runApp(T);
}
function zk0(T, R, a) {
  if (T.selectableId === R.selectableId) return T.offset - R.offset;
  return a(T.selectableId, R.selectableId);
}
class cT {
  color;
  backgroundColor;
  bold;
  italic;
  underline;
  strikethrough;
  dim;
  constructor({
    color: T,
    backgroundColor: R,
    bold: a,
    italic: e,
    underline: t,
    strikethrough: r,
    dim: h
  } = {}) {
    if (T !== void 0) this.color = T;
    if (R !== void 0) this.backgroundColor = R;
    if (a !== void 0) this.bold = a;
    if (e !== void 0) this.italic = e;
    if (t !== void 0) this.underline = t;
    if (r !== void 0) this.strikethrough = r;
    if (h !== void 0) this.dim = h;
  }
  copyWith({
    color: T,
    backgroundColor: R,
    bold: a,
    italic: e,
    underline: t,
    strikethrough: r,
    dim: h
  }) {
    let i = {};
    if (T !== void 0 || this.color !== void 0) i.color = T ?? this.color;
    if (R !== void 0 || this.backgroundColor !== void 0) i.backgroundColor = R ?? this.backgroundColor;
    if (a !== void 0 || this.bold !== void 0) i.bold = a ?? this.bold;
    if (e !== void 0 || this.italic !== void 0) i.italic = e ?? this.italic;
    if (t !== void 0 || this.underline !== void 0) i.underline = t ?? this.underline;
    if (r !== void 0 || this.strikethrough !== void 0) i.strikethrough = r ?? this.strikethrough;
    if (h !== void 0 || this.dim !== void 0) i.dim = h ?? this.dim;
    return new cT(i);
  }
  merge(T) {
    if (!T) return this;
    let R = {};
    if (T.color !== void 0 || this.color !== void 0) R.color = T.color ?? this.color;
    if (T.backgroundColor !== void 0 || this.backgroundColor !== void 0) R.backgroundColor = T.backgroundColor ?? this.backgroundColor;
    if (T.bold !== void 0 || this.bold !== void 0) R.bold = T.bold ?? this.bold;
    if (T.italic !== void 0 || this.italic !== void 0) R.italic = T.italic ?? this.italic;
    if (T.underline !== void 0 || this.underline !== void 0) R.underline = T.underline ?? this.underline;
    if (T.strikethrough !== void 0 || this.strikethrough !== void 0) R.strikethrough = T.strikethrough ?? this.strikethrough;
    if (T.dim !== void 0 || this.dim !== void 0) R.dim = T.dim ?? this.dim;
    return new cT(R);
  }
  static normal(T) {
    return T ? new cT({
      color: T
    }) : new cT();
  }
  static bold(T) {
    return T ? new cT({
      color: T,
      bold: !0
    }) : new cT({
      bold: !0
    });
  }
  static italic(T) {
    return T ? new cT({
      color: T,
      italic: !0
    }) : new cT({
      italic: !0
    });
  }
  static underline(T) {
    return T ? new cT({
      color: T,
      underline: !0
    }) : new cT({
      underline: !0
    });
  }
  static colored(T) {
    return new cT({
      color: T
    });
  }
  static background(T) {
    return new cT({
      backgroundColor: T
    });
  }
}