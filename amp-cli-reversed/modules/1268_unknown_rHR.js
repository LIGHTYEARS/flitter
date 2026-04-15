function rHR(T, R, a, e) {
  let t = R.slice(),
    r = eHR(T, []),
    h = void 0,
    i = void 0;
  while (t.length > 0) if (i = t.pop(), h = KmT(r, t), h === void 0 && a !== void 0) {
    if (typeof i === "string") a = {
      [i]: a
    };else a = [a];
  } else break;
  if (!h) {
    if (a === void 0) throw Error("Can not delete in empty document");
    return r_(T, {
      offset: r ? r.offset : 0,
      length: r ? r.length : 0,
      content: JSON.stringify(a)
    }, e);
  } else if (h.type === "object" && typeof i === "string" && Array.isArray(h.children)) {
    let c = KmT(h, [i]);
    if (c !== void 0) {
      if (a === void 0) {
        if (!c.parent) throw Error("Malformed AST");
        let s = h.children.indexOf(c.parent),
          A,
          l = c.parent.offset + c.parent.length;
        if (s > 0) {
          let o = h.children[s - 1];
          A = o.offset + o.length;
        } else if (A = h.offset + 1, h.children.length > 1) l = h.children[1].offset;
        return r_(T, {
          offset: A,
          length: l - A,
          content: ""
        }, e);
      } else return r_(T, {
        offset: c.offset,
        length: c.length,
        content: JSON.stringify(a)
      }, e);
    } else {
      if (a === void 0) return [];
      let s = `${JSON.stringify(i)}: ${JSON.stringify(a)}`,
        A = e.getInsertionIndex ? e.getInsertionIndex(h.children.map(o => o.children[0].value)) : h.children.length,
        l;
      if (A > 0) {
        let o = h.children[A - 1];
        l = {
          offset: o.offset + o.length,
          length: 0,
          content: "," + s
        };
      } else if (h.children.length === 0) l = {
        offset: h.offset + 1,
        length: 0,
        content: s
      };else l = {
        offset: h.offset + 1,
        length: 0,
        content: s + ","
      };
      return r_(T, l, e);
    }
  } else if (h.type === "array" && typeof i === "number" && Array.isArray(h.children)) {
    let c = i;
    if (c === -1) {
      let s = `${JSON.stringify(a)}`,
        A;
      if (h.children.length === 0) A = {
        offset: h.offset + 1,
        length: 0,
        content: s
      };else {
        let l = h.children[h.children.length - 1];
        A = {
          offset: l.offset + l.length,
          length: 0,
          content: "," + s
        };
      }
      return r_(T, A, e);
    } else if (a === void 0 && h.children.length >= 0) {
      let s = i,
        A = h.children[s],
        l;
      if (h.children.length === 1) l = {
        offset: h.offset + 1,
        length: h.length - 2,
        content: ""
      };else if (h.children.length - 1 === s) {
        let o = h.children[s - 1],
          n = o.offset + o.length,
          p = h.offset + h.length;
        l = {
          offset: n,
          length: p - 2 - n,
          content: ""
        };
      } else l = {
        offset: A.offset,
        length: h.children[s + 1].offset - A.offset,
        content: ""
      };
      return r_(T, l, e);
    } else if (a !== void 0) {
      let s,
        A = `${JSON.stringify(a)}`;
      if (!e.isArrayInsertion && h.children.length > i) {
        let l = h.children[i];
        s = {
          offset: l.offset,
          length: l.length,
          content: A
        };
      } else if (h.children.length === 0 || i === 0) s = {
        offset: h.offset + 1,
        length: 0,
        content: h.children.length === 0 ? A : A + ","
      };else {
        let l = i > h.children.length ? h.children.length : i,
          o = h.children[l - 1];
        s = {
          offset: o.offset + o.length,
          length: 0,
          content: "," + A
        };
      }
      return r_(T, s, e);
    } else throw Error(`Can not ${a === void 0 ? "remove" : e.isArrayInsertion ? "insert" : "modify"} Array index ${c} as length is not sufficient`);
  } else throw Error(`Can not add ${typeof i !== "number" ? "index" : "property"} to parent of type ${h.type}`);
}