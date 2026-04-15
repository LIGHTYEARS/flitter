function fw0(T, R, a) {
  if (this.options.ignoreAttributes !== !0 && typeof T === "string") {
    let e = tTR(T, xw0),
      t = e.length,
      r = {};
    for (let h = 0; h < t; h++) {
      let i = this.resolveNameSpace(e[h][1]);
      if (this.ignoreAttributesFn(i, R)) continue;
      let c = e[h][4],
        s = this.options.attributeNamePrefix + i;
      if (i.length) {
        if (this.options.transformAttributeName) s = this.options.transformAttributeName(s);
        if (s === "__proto__") s = "#__proto__";
        if (c !== void 0) {
          if (this.options.trimValues) c = c.trim();
          c = this.replaceEntitiesValue(c);
          let A = this.options.attributeValueProcessor(i, c, R);
          if (A === null || A === void 0) r[s] = c;else if (typeof A !== typeof c || A !== c) r[s] = A;else r[s] = IQ(c, this.options.parseAttributeValue, this.options.numberParseOptions);
        } else if (this.options.allowBooleanAttributes) r[s] = !0;
      }
    }
    if (!Object.keys(r).length) return;
    if (this.options.attributesGroupName) {
      let h = {};
      return h[this.options.attributesGroupName] = r, h;
    }
    return r;
  }
}