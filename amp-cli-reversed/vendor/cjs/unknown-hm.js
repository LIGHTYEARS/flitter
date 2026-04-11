// Module: unknown-hm
// Original: hm
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: hm (CJS)
(T, R) => {
  R.exports = c;
  var a = im();
  ((c.prototype = Object.create(a.prototype)).constructor = c).className =
    "Field";
  var e = Gs(),
    t = Ax(),
    r = Fe(),
    h,
    i = /^required|optional|repeated$/;
  c.fromJSON = function (s, A) {
    var l = new c(s, A.id, A.type, A.rule, A.extend, A.options, A.comment);
    if (A.edition) l._edition = A.edition;
    return ((l._defaultEdition = "proto3"), l);
  };
  function c(s, A, l, o, n, p, _) {
    if (r.isObject(o)) ((_ = n), (p = o), (o = n = void 0));
    else if (r.isObject(n)) ((_ = p), (p = n), (n = void 0));
    if ((a.call(this, s, p), !r.isInteger(A) || A < 0))
      throw TypeError("id must be a non-negative integer");
    if (!r.isString(l)) throw TypeError("type must be a string");
    if (o !== void 0 && !i.test((o = o.toString().toLowerCase())))
      throw TypeError("rule must be a string rule");
    if (n !== void 0 && !r.isString(n))
      throw TypeError("extend must be a string");
    if (o === "proto3_optional") o = "optional";
    ((this.rule = o && o !== "optional" ? o : void 0),
      (this.type = l),
      (this.id = A),
      (this.extend = n || void 0),
      (this.repeated = o === "repeated"),
      (this.map = !1),
      (this.message = null),
      (this.partOf = null),
      (this.typeDefault = null),
      (this.defaultValue = null),
      (this.long = r.Long ? t.long[l] !== void 0 : !1),
      (this.bytes = l === "bytes"),
      (this.resolvedType = null),
      (this.extensionField = null),
      (this.declaringField = null),
      (this.comment = _));
  }
  (Object.defineProperty(c.prototype, "required", {
    get: function () {
      return this._features.field_presence === "LEGACY_REQUIRED";
    },
  }),
    Object.defineProperty(c.prototype, "optional", {
      get: function () {
        return !this.required;
      },
    }),
    Object.defineProperty(c.prototype, "delimited", {
      get: function () {
        return (
          this.resolvedType instanceof h &&
          this._features.message_encoding === "DELIMITED"
        );
      },
    }),
    Object.defineProperty(c.prototype, "packed", {
      get: function () {
        return this._features.repeated_field_encoding === "PACKED";
      },
    }),
    Object.defineProperty(c.prototype, "hasPresence", {
      get: function () {
        if (this.repeated || this.map) return !1;
        return (
          this.partOf ||
          this.declaringField ||
          this.extensionField ||
          this._features.field_presence !== "IMPLICIT"
        );
      },
    }),
    (c.prototype.setOption = function (s, A, l) {
      return a.prototype.setOption.call(this, s, A, l);
    }),
    (c.prototype.toJSON = function (s) {
      var A = s ? Boolean(s.keepComments) : !1;
      return r.toObject([
        "edition",
        this._editionToJSON(),
        "rule",
        (this.rule !== "optional" && this.rule) || void 0,
        "type",
        this.type,
        "id",
        this.id,
        "extend",
        this.extend,
        "options",
        this.options,
        "comment",
        A ? this.comment : void 0,
      ]);
    }),
    (c.prototype.resolve = function () {
      if (this.resolved) return this;
      if ((this.typeDefault = t.defaults[this.type]) === void 0)
        if (
          ((this.resolvedType = (
            this.declaringField ? this.declaringField.parent : this.parent
          ).lookupTypeOrEnum(this.type)),
          this.resolvedType instanceof h)
        )
          this.typeDefault = null;
        else
          this.typeDefault =
            this.resolvedType.values[Object.keys(this.resolvedType.values)[0]];
      else if (this.options && this.options.proto3_optional)
        this.typeDefault = null;
      if (this.options && this.options.default != null) {
        if (
          ((this.typeDefault = this.options.default),
          this.resolvedType instanceof e &&
            typeof this.typeDefault === "string")
        )
          this.typeDefault = this.resolvedType.values[this.typeDefault];
      }
      if (this.options) {
        if (
          this.options.packed !== void 0 &&
          this.resolvedType &&
          !(this.resolvedType instanceof e)
        )
          delete this.options.packed;
        if (!Object.keys(this.options).length) this.options = void 0;
      }
      if (this.long) {
        if (
          ((this.typeDefault = r.Long.fromNumber(
            this.typeDefault,
            this.type.charAt(0) === "u",
          )),
          Object.freeze)
        )
          Object.freeze(this.typeDefault);
      } else if (this.bytes && typeof this.typeDefault === "string") {
        var s;
        if (r.base64.test(this.typeDefault))
          r.base64.decode(
            this.typeDefault,
            (s = r.newBuffer(r.base64.length(this.typeDefault))),
            0,
          );
        else
          r.utf8.write(
            this.typeDefault,
            (s = r.newBuffer(r.utf8.length(this.typeDefault))),
            0,
          );
        this.typeDefault = s;
      }
      if (this.map) this.defaultValue = r.emptyObject;
      else if (this.repeated) this.defaultValue = r.emptyArray;
      else this.defaultValue = this.typeDefault;
      if (this.parent instanceof h)
        this.parent.ctor.prototype[this.name] = this.defaultValue;
      return a.prototype.resolve.call(this);
    }),
    (c.prototype._inferLegacyProtoFeatures = function (s) {
      if (s !== "proto2" && s !== "proto3") return {};
      var A = {};
      if (this.rule === "required") A.field_presence = "LEGACY_REQUIRED";
      if (this.parent && t.defaults[this.type] === void 0) {
        var l = this.parent.get(this.type.split(".").pop());
        if (l && l instanceof h && l.group) A.message_encoding = "DELIMITED";
      }
      if (this.getOption("packed") === !0) A.repeated_field_encoding = "PACKED";
      else if (this.getOption("packed") === !1)
        A.repeated_field_encoding = "EXPANDED";
      return A;
    }),
    (c.prototype._resolveFeatures = function (s) {
      return a.prototype._resolveFeatures.call(this, this._edition || s);
    }),
    (c.d = function (s, A, l, o) {
      if (typeof A === "function") A = r.decorateType(A).name;
      else if (A && typeof A === "object") A = r.decorateEnum(A).name;
      return function (n, p) {
        r.decorateType(n.constructor).add(new c(p, s, A, l, { default: o }));
      };
    }),
    (c._configure = function (s) {
      h = s;
    }));
};
