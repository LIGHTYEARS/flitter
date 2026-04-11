// Module: yaml-set
// Original: wDT
// Type: CJS (RT wrapper)
// Exports: YAMLSet, set
// Category: util

// Module: wDT (CJS)
(T) => {
  var R = x8(),
    a = Pm(),
    e = km();
  class t extends e.YAMLMap {
    constructor(h) {
      super(h);
      this.tag = t.tag;
    }
    add(h) {
      let i;
      if (R.isPair(h)) i = h;
      else if (
        h &&
        typeof h === "object" &&
        "key" in h &&
        "value" in h &&
        h.value === null
      )
        i = new a.Pair(h.key, null);
      else i = new a.Pair(h, null);
      if (!e.findPair(this.items, i.key)) this.items.push(i);
    }
    get(h, i) {
      let c = e.findPair(this.items, h);
      return !i && R.isPair(c) ? (R.isScalar(c.key) ? c.key.value : c.key) : c;
    }
    set(h, i) {
      if (typeof i !== "boolean")
        throw Error(
          `Expected boolean value for set(key, value) in a YAML set, not ${typeof i}`,
        );
      let c = e.findPair(this.items, h);
      if (c && !i) this.items.splice(this.items.indexOf(c), 1);
      else if (!c && i) this.items.push(new a.Pair(h));
    }
    toJSON(h, i) {
      return super.toJSON(h, i, Set);
    }
    toString(h, i, c) {
      if (!h) return JSON.stringify(this);
      if (this.hasAllNullValues(!0))
        return super.toString(
          Object.assign({}, h, { allNullValues: !0 }),
          i,
          c,
        );
      else throw Error("Set items must all have null values");
    }
    static from(h, i, c) {
      let { replacer: s } = c,
        A = new this(h);
      if (i && Symbol.iterator in Object(i))
        for (let l of i) {
          if (typeof s === "function") l = s.call(i, l, l);
          A.items.push(a.createPair(l, null, c));
        }
      return A;
    }
  }
  t.tag = "tag:yaml.org,2002:set";
  var r = {
    collection: "map",
    identify: (h) => h instanceof Set,
    nodeClass: t,
    default: !1,
    tag: "tag:yaml.org,2002:set",
    createNode: (h, i, c) => t.from(h, i, c),
    resolve(h, i) {
      if (R.isMap(h))
        if (h.hasAllNullValues(!0)) return Object.assign(new t(), h);
        else i("Set items must all have null values");
      else i("Expected a mapping for this tag");
      return h;
    },
  };
  ((T.YAMLSet = t), (T.set = r));
};
