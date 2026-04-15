class cW {
  constructor(T) {
    this.externalEntities = {}, this.options = sw0(T);
  }
  parse(T, R) {
    if (typeof T !== "string" && T.toString) T = T.toString();else if (typeof T !== "string") throw Error("XML data is accepted in String or Bytes[] form.");
    if (R) {
      if (R === !0) R = {};
      let t = J70(T, R);
      if (t !== !0) throw Error(`${t.err.msg}:${t.err.line}:${t.err.col}`);
    }
    let a = new hTR(this.options);
    a.addExternalEntities(this.externalEntities);
    let e = a.parseXml(T);
    if (this.options.preserveOrder || e === void 0) return e;else return dw0(e, this.options);
  }
  addEntity(T, R) {
    if (R.indexOf("&") !== -1) throw Error("Entity value can't have '&'");else if (T.indexOf("&") !== -1 || T.indexOf(";") !== -1) throw Error("An entity must be set without '&' and ';'. Eg. use '#xD' for '&#xD;'");else if (R === "&") throw Error("An entity with value '&' is not permitted");else this.externalEntities[T] = R;
  }
  static getMetaDataSymbol() {
    return Hl.getMetaDataSymbol();
  }
}