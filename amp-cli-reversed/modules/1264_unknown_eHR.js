function eHR(T, R = [], a = Qj.DEFAULT) {
  let e = {
    type: "array",
    offset: -1,
    length: -1,
    children: [],
    parent: void 0
  };
  function t(i) {
    if (e.type === "property") e.length = i - e.offset, e = e.parent;
  }
  function r(i) {
    return e.children.push(i), i;
  }
  S5T(T, {
    onObjectBegin: i => {
      e = r({
        type: "object",
        offset: i,
        length: -1,
        parent: e,
        children: []
      });
    },
    onObjectProperty: (i, c, s) => {
      e = r({
        type: "property",
        offset: c,
        length: -1,
        parent: e,
        children: []
      }), e.children.push({
        type: "string",
        value: i,
        offset: c,
        length: s,
        parent: e
      });
    },
    onObjectEnd: (i, c) => {
      t(i + c), e.length = i + c - e.offset, e = e.parent, t(i + c);
    },
    onArrayBegin: (i, c) => {
      e = r({
        type: "array",
        offset: i,
        length: -1,
        parent: e,
        children: []
      });
    },
    onArrayEnd: (i, c) => {
      e.length = i + c - e.offset, e = e.parent, t(i + c);
    },
    onLiteralValue: (i, c, s) => {
      r({
        type: tHR(i),
        offset: c,
        length: s,
        parent: e,
        value: i
      }), t(c + s);
    },
    onSeparator: (i, c, s) => {
      if (e.type === "property") {
        if (i === ":") e.colonOffset = c;else if (i === ",") t(c);
      }
    },
    onError: (i, c, s) => {
      R.push({
        error: i,
        offset: c,
        length: s
      });
    }
  }, a);
  let h = e.children[0];
  if (h) delete h.parent;
  return h;
}