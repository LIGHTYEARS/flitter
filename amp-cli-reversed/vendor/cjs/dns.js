// Module: dns
// Original: CS
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: util

// Module: CS (CJS)
(T, R) => {
  R.exports = A;
  var a = im();
  ((A.prototype = Object.create(a.prototype)).constructor = A).className =
    "Namespace";
  var e = hm(),
    t = Fe(),
    r = px(),
    h,
    i,
    c;
  A.fromJSON = function (o, n) {
    return new A(o, n.options).addJSON(n.nested);
  };
  function s(o, n) {
    if (!(o && o.length)) return;
    var p = {};
    for (var _ = 0; _ < o.length; ++_) p[o[_].name] = o[_].toJSON(n);
    return p;
  }
  ((A.arrayToJSON = s),
    (A.isReservedId = function (o, n) {
      if (o) {
        for (var p = 0; p < o.length; ++p)
          if (typeof o[p] !== "string" && o[p][0] <= n && o[p][1] > n)
            return !0;
      }
      return !1;
    }),
    (A.isReservedName = function (o, n) {
      if (o) {
        for (var p = 0; p < o.length; ++p) if (o[p] === n) return !0;
      }
      return !1;
    }));
  function A(o, n) {
    (a.call(this, o, n),
      (this.nested = void 0),
      (this._nestedArray = null),
      (this._lookupCache = {}),
      (this._needsRecursiveFeatureResolution = !0),
      (this._needsRecursiveResolve = !0));
  }
  function l(o) {
    ((o._nestedArray = null), (o._lookupCache = {}));
    var n = o;
    while ((n = n.parent)) n._lookupCache = {};
    return o;
  }
  (Object.defineProperty(A.prototype, "nestedArray", {
    get: function () {
      return this._nestedArray || (this._nestedArray = t.toArray(this.nested));
    },
  }),
    (A.prototype.toJSON = function (o) {
      return t.toObject([
        "options",
        this.options,
        "nested",
        s(this.nestedArray, o),
      ]);
    }),
    (A.prototype.addJSON = function (o) {
      var n = this;
      if (o)
        for (var p = Object.keys(o), _ = 0, m; _ < p.length; ++_)
          ((m = o[p[_]]),
            n.add(
              (m.fields !== void 0
                ? h.fromJSON
                : m.values !== void 0
                  ? c.fromJSON
                  : m.methods !== void 0
                    ? i.fromJSON
                    : m.id !== void 0
                      ? e.fromJSON
                      : A.fromJSON)(p[_], m),
            ));
      return this;
    }),
    (A.prototype.get = function (o) {
      return (this.nested && this.nested[o]) || null;
    }),
    (A.prototype.getEnum = function (o) {
      if (this.nested && this.nested[o] instanceof c)
        return this.nested[o].values;
      throw Error("no such enum: " + o);
    }),
    (A.prototype.add = function (o) {
      if (
        !(
          (o instanceof e && o.extend !== void 0) ||
          o instanceof h ||
          o instanceof r ||
          o instanceof c ||
          o instanceof i ||
          o instanceof A
        )
      )
        throw TypeError("object must be a valid nested object");
      if (!this.nested) this.nested = {};
      else {
        var n = this.get(o.name);
        if (n)
          if (
            n instanceof A &&
            o instanceof A &&
            !(n instanceof h || n instanceof i)
          ) {
            var p = n.nestedArray;
            for (var _ = 0; _ < p.length; ++_) o.add(p[_]);
            if ((this.remove(n), !this.nested)) this.nested = {};
            o.setOptions(n.options, !0);
          } else throw Error("duplicate name '" + o.name + "' in " + this);
      }
      if (
        ((this.nested[o.name] = o),
        !(
          this instanceof h ||
          this instanceof i ||
          this instanceof c ||
          this instanceof e
        ))
      ) {
        if (!o._edition) o._edition = o._defaultEdition;
      }
      ((this._needsRecursiveFeatureResolution = !0),
        (this._needsRecursiveResolve = !0));
      var m = this;
      while ((m = m.parent))
        ((m._needsRecursiveFeatureResolution = !0),
          (m._needsRecursiveResolve = !0));
      return (o.onAdd(this), l(this));
    }),
    (A.prototype.remove = function (o) {
      if (!(o instanceof a))
        throw TypeError("object must be a ReflectionObject");
      if (o.parent !== this) throw Error(o + " is not a member of " + this);
      if ((delete this.nested[o.name], !Object.keys(this.nested).length))
        this.nested = void 0;
      return (o.onRemove(this), l(this));
    }),
    (A.prototype.define = function (o, n) {
      if (t.isString(o)) o = o.split(".");
      else if (!Array.isArray(o)) throw TypeError("illegal path");
      if (o && o.length && o[0] === "") throw Error("path must be relative");
      var p = this;
      while (o.length > 0) {
        var _ = o.shift();
        if (p.nested && p.nested[_]) {
          if (((p = p.nested[_]), !(p instanceof A)))
            throw Error("path conflicts with non-namespace objects");
        } else p.add((p = new A(_)));
      }
      if (n) p.addJSON(n);
      return p;
    }),
    (A.prototype.resolveAll = function () {
      if (!this._needsRecursiveResolve) return this;
      this._resolveFeaturesRecursive(this._edition);
      var o = this.nestedArray,
        n = 0;
      this.resolve();
      while (n < o.length)
        if (o[n] instanceof A) o[n++].resolveAll();
        else o[n++].resolve();
      return ((this._needsRecursiveResolve = !1), this);
    }),
    (A.prototype._resolveFeaturesRecursive = function (o) {
      if (!this._needsRecursiveFeatureResolution) return this;
      return (
        (this._needsRecursiveFeatureResolution = !1),
        (o = this._edition || o),
        a.prototype._resolveFeaturesRecursive.call(this, o),
        this.nestedArray.forEach((n) => {
          n._resolveFeaturesRecursive(o);
        }),
        this
      );
    }),
    (A.prototype.lookup = function (o, n, p) {
      if (typeof n === "boolean") ((p = n), (n = void 0));
      else if (n && !Array.isArray(n)) n = [n];
      if (t.isString(o) && o.length) {
        if (o === ".") return this.root;
        o = o.split(".");
      } else if (!o.length) return this;
      var _ = o.join(".");
      if (o[0] === "") return this.root.lookup(o.slice(1), n);
      var m =
        this.root._fullyQualifiedObjects &&
        this.root._fullyQualifiedObjects["." + _];
      if (m && (!n || n.indexOf(m.constructor) > -1)) return m;
      if (
        ((m = this._lookupImpl(o, _)),
        m && (!n || n.indexOf(m.constructor) > -1))
      )
        return m;
      if (p) return null;
      var b = this;
      while (b.parent) {
        if (
          ((m = b.parent._lookupImpl(o, _)),
          m && (!n || n.indexOf(m.constructor) > -1))
        )
          return m;
        b = b.parent;
      }
      return null;
    }),
    (A.prototype._lookupImpl = function (o, n) {
      if (Object.prototype.hasOwnProperty.call(this._lookupCache, n))
        return this._lookupCache[n];
      var p = this.get(o[0]),
        _ = null;
      if (p) {
        if (o.length === 1) _ = p;
        else if (p instanceof A)
          ((o = o.slice(1)), (_ = p._lookupImpl(o, o.join("."))));
      } else
        for (var m = 0; m < this.nestedArray.length; ++m)
          if (
            this._nestedArray[m] instanceof A &&
            (p = this._nestedArray[m]._lookupImpl(o, n))
          )
            _ = p;
      return ((this._lookupCache[n] = _), _);
    }),
    (A.prototype.lookupType = function (o) {
      var n = this.lookup(o, [h]);
      if (!n) throw Error("no such type: " + o);
      return n;
    }),
    (A.prototype.lookupEnum = function (o) {
      var n = this.lookup(o, [c]);
      if (!n) throw Error("no such Enum '" + o + "' in " + this);
      return n;
    }),
    (A.prototype.lookupTypeOrEnum = function (o) {
      var n = this.lookup(o, [h, c]);
      if (!n) throw Error("no such Type or Enum '" + o + "' in " + this);
      return n;
    }),
    (A.prototype.lookupService = function (o) {
      var n = this.lookup(o, [i]);
      if (!n) throw Error("no such Service '" + o + "' in " + this);
      return n;
    }),
    (A._configure = function (o, n, p) {
      ((h = o), (i = n), (c = p));
    }));
};
