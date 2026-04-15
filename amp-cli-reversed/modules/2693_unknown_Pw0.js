function Pw0(T, R, a, e, t, r, h) {
  if (T !== void 0) {
    if (this.options.trimValues && !e) T = T.trim();
    if (T.length > 0) {
      if (!h) T = this.replaceEntitiesValue(T);
      let i = this.options.tagValueProcessor(R, T, a, t, r);
      if (i === null || i === void 0) return T;else if (typeof i !== typeof T || i !== T) return i;else if (this.options.trimValues) return IQ(T, this.options.parseTagValue, this.options.numberParseOptions);else if (T.trim() === T) return IQ(T, this.options.parseTagValue, this.options.numberParseOptions);else return T;
    }
  }
}