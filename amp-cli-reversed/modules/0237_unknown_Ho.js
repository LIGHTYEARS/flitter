function Ir0() {
  return new kGT();
}
function vz(T) {
  return T === void 0;
}
function gr0(T, R) {
  let a = {};
  return Object.entries(T).forEach(([e, t]) => {
    if (!R.some(r => r === e)) a[e] = t;
  }), a;
}
function jz(T, R) {
  let a = {};
  return Object.entries(T).forEach(([e, t]) => {
    if (!R(t, e)) a[e] = t;
  }), a;
}
class Ho {
  static collectMetadata(T, R) {
    let a = this.getMetadataFromRegistry(T),
      e = Object.assign(Object.assign({}, a === null || a === void 0 ? void 0 : a._internal), R === null || R === void 0 ? void 0 : R._internal),
      t = Object.assign(Object.assign({}, a === null || a === void 0 ? void 0 : a.param), R === null || R === void 0 ? void 0 : R.param),
      r = Object.assign(Object.assign(Object.assign(Object.assign({}, Object.keys(e).length > 0 ? {
        _internal: e
      } : {}), a), R), Object.keys(t).length > 0 ? {
        param: t
      } : {});
    if (No(T, ["ZodOptional", "ZodNullable", "ZodDefault", "ZodPrefault", "ZodReadonly", "ZodNonOptional"]) && Ry(T._zod.def.innerType)) return this.collectMetadata(T._zod.def.innerType, r);
    if (No(T, "ZodPipe")) {
      let h = T._zod.def.in,
        i = T._zod.def.out;
      if (No(h, "ZodTransform") && Ry(i)) return this.collectMetadata(i, r);
      if (Ry(h)) return this.collectMetadata(h, r);
    }
    return r;
  }
  static getMetadata(T) {
    return this.collectMetadata(T);
  }
  static getOpenApiMetadata(T) {
    let R = this.collectMetadata(T),
      a = R !== null && R !== void 0 ? R : {},
      {
        _internal: e
      } = a;
    return NP(a, ["_internal"]);
  }
  static getInternalMetadata(T) {
    var R;
    return (R = this.collectMetadata(T)) === null || R === void 0 ? void 0 : R._internal;
  }
  static getParamMetadata(T) {
    let R = this.collectMetadata(T);
    return Object.assign(Object.assign({}, R), {
      param: Object.assign(Object.assign({}, (R === null || R === void 0 ? void 0 : R.description) ? {
        description: R.description
      } : {}), R === null || R === void 0 ? void 0 : R.param)
    });
  }
  static buildSchemaMetadata(T) {
    return jz(gr0(T, ["param", "_internal"]), vz);
  }
  static buildParameterMetadata(T) {
    return jz(T, vz);
  }
  static applySchemaMetadata(T, R) {
    return jz(Object.assign(Object.assign({}, T), this.buildSchemaMetadata(R)), vz);
  }
  static getRefId(T) {
    var R;
    return (R = this.getInternalMetadata(T)) === null || R === void 0 ? void 0 : R.refId;
  }
  static unwrapChained(T) {
    return this.unwrapUntil(T);
  }
  static getDefaultValue(T) {
    var R;
    let a = (R = this.unwrapUntil(T, "ZodDefault")) !== null && R !== void 0 ? R : this.unwrapUntil(T, "ZodPrefault");
    return a === null || a === void 0 ? void 0 : a._zod.def.defaultValue;
  }
  static unwrapUntil(T, R) {
    if (R && No(T, R)) return T;
    if (No(T, ["ZodOptional", "ZodNullable", "ZodDefault", "ZodPrefault", "ZodReadonly", "ZodNonOptional"]) && Ry(T._zod.def.innerType)) return this.unwrapUntil(T._zod.def.innerType, R);
    if (No(T, "ZodPipe")) {
      let a = T._zod.def.in,
        e = T._zod.def.out;
      if (No(a, "ZodTransform") && Ry(e)) return this.unwrapUntil(e, R);
      if (Ry(a)) return this.unwrapUntil(a, R);
    }
    return R ? void 0 : T;
  }
  static getMetadataFromInternalRegistry(T) {
    return OPT.get(T);
  }
  static getMetadataFromRegistry(T) {
    let R = this.getMetadataFromInternalRegistry(T),
      a = T.meta();
    if (!R) return a;
    let {
        _internal: e
      } = R,
      t = NP(R, ["_internal"]),
      r = a !== null && a !== void 0 ? a : {},
      {
        id: h,
        title: i
      } = r,
      c = NP(r, ["id", "title"]);
    return Object.assign(Object.assign(Object.assign({
      _internal: Object.assign(Object.assign({}, h ? {
        refId: h
      } : {}), e)
    }, t), i ? {
      description: i
    } : {}), c);
  }
  static setMetadataInRegistry(T, R) {
    OPT.add(T, R);
  }
}