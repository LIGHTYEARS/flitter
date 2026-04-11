// Module: unknown-px
// Original: px
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: px (CJS)
(T, R) => {
  R.exports = r;
  var a = im();
  ((r.prototype = Object.create(a.prototype)).constructor = r).className =
    "OneOf";
  var e = hm(),
    t = Fe();
  function r(i, c, s, A) {
    if (!Array.isArray(c)) ((s = c), (c = void 0));
    if ((a.call(this, i, s), !(c === void 0 || Array.isArray(c))))
      throw TypeError("fieldNames must be an Array");
    ((this.oneof = c || []), (this.fieldsArray = []), (this.comment = A));
  }
  ((r.fromJSON = function (i, c) {
    return new r(i, c.oneof, c.options, c.comment);
  }),
    (r.prototype.toJSON = function (i) {
      var c = i ? Boolean(i.keepComments) : !1;
      return t.toObject([
        "options",
        this.options,
        "oneof",
        this.oneof,
        "comment",
        c ? this.comment : void 0,
      ]);
    }));
  function h(i) {
    if (i.parent) {
      for (var c = 0; c < i.fieldsArray.length; ++c)
        if (!i.fieldsArray[c].parent) i.parent.add(i.fieldsArray[c]);
    }
  }
  ((r.prototype.add = function (i) {
    if (!(i instanceof e)) throw TypeError("field must be a Field");
    if (i.parent && i.parent !== this.parent) i.parent.remove(i);
    return (
      this.oneof.push(i.name),
      this.fieldsArray.push(i),
      (i.partOf = this),
      h(this),
      this
    );
  }),
    (r.prototype.remove = function (i) {
      if (!(i instanceof e)) throw TypeError("field must be a Field");
      var c = this.fieldsArray.indexOf(i);
      if (c < 0) throw Error(i + " is not a member of " + this);
      if (
        (this.fieldsArray.splice(c, 1),
        (c = this.oneof.indexOf(i.name)),
        c > -1)
      )
        this.oneof.splice(c, 1);
      return ((i.partOf = null), this);
    }),
    (r.prototype.onAdd = function (i) {
      a.prototype.onAdd.call(this, i);
      var c = this;
      for (var s = 0; s < this.oneof.length; ++s) {
        var A = i.get(this.oneof[s]);
        if (A && !A.partOf) ((A.partOf = c), c.fieldsArray.push(A));
      }
      h(this);
    }),
    (r.prototype.onRemove = function (i) {
      for (var c = 0, s; c < this.fieldsArray.length; ++c)
        if ((s = this.fieldsArray[c]).parent) s.parent.remove(s);
      a.prototype.onRemove.call(this, i);
    }),
    Object.defineProperty(r.prototype, "isProto3Optional", {
      get: function () {
        if (this.fieldsArray == null || this.fieldsArray.length !== 1)
          return !1;
        var i = this.fieldsArray[0];
        return i.options != null && i.options.proto3_optional === !0;
      },
    }),
    (r.d = function () {
      var i = Array(arguments.length),
        c = 0;
      while (c < arguments.length) i[c] = arguments[c++];
      return function (s, A) {
        (t.decorateType(s.constructor).add(new r(A, i)),
          Object.defineProperty(s, A, {
            get: t.oneOfGetter(i),
            set: t.oneOfSetter(i),
          }));
      };
    }));
};
