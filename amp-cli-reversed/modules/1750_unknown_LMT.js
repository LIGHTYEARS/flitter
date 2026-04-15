function XuR() {
  let T = new MMT.default({
    strict: !1,
    validateFormats: !0,
    validateSchema: !1,
    allErrors: !0
  });
  return DMT.default(T), T;
}
class LMT {
  constructor(T) {
    this._ajv = T ?? XuR();
  }
  getValidator(T) {
    let R = "$id" in T && typeof T.$id === "string" ? this._ajv.getSchema(T.$id) ?? this._ajv.compile(T) : this._ajv.compile(T);
    return a => {
      if (R(a)) return {
        valid: !0,
        data: a,
        errorMessage: void 0
      };else return {
        valid: !1,
        data: void 0,
        errorMessage: this._ajv.errorsText(R.errors)
      };
    };
  }
}