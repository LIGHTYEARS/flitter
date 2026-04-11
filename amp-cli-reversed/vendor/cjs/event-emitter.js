// Module: event-emitter
// Original: $n
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: util

// Module: $n (CJS)
(T) => {
  var R = T;
  ((R.asPromise = avT()),
    (R.base64 = arR()),
    (R.EventEmitter = erR()),
    (R.float = trR()),
    (R.inquire = evT()),
    (R.utf8 = rrR()),
    (R.pool = hrR()),
    (R.LongBits = irR()),
    (R.isNode = Boolean(
      typeof global < "u" &&
      global &&
      global.process &&
      global.process.versions &&
      global.process.versions.node,
    )),
    (R.global =
      (R.isNode && global) ||
      (typeof window < "u" && window) ||
      (typeof self < "u" && self) ||
      T),
    (R.emptyArray = Object.freeze ? Object.freeze([]) : []),
    (R.emptyObject = Object.freeze ? Object.freeze({}) : {}),
    (R.isInteger =
      Number.isInteger ||
      function (t) {
        return typeof t === "number" && isFinite(t) && Math.floor(t) === t;
      }),
    (R.isString = function (t) {
      return typeof t === "string" || t instanceof String;
    }),
    (R.isObject = function (t) {
      return t && typeof t === "object";
    }),
    (R.isset = R.isSet =
      function (t, r) {
        var h = t[r];
        if (h != null && t.hasOwnProperty(r))
          return (
            typeof h !== "object" ||
            (Array.isArray(h) ? h.length : Object.keys(h).length) > 0
          );
        return !1;
      }),
    (R.Buffer = (function () {
      try {
        var t = R.inquire("buffer").Buffer;
        return t.prototype.utf8Write ? t : null;
      } catch (r) {
        return null;
      }
    })()),
    (R._Buffer_from = null),
    (R._Buffer_allocUnsafe = null),
    (R.newBuffer = function (t) {
      return typeof t === "number"
        ? R.Buffer
          ? R._Buffer_allocUnsafe(t)
          : new R.Array(t)
        : R.Buffer
          ? R._Buffer_from(t)
          : typeof Uint8Array > "u"
            ? t
            : new Uint8Array(t);
    }),
    (R.Array = typeof Uint8Array < "u" ? Uint8Array : Array),
    (R.Long =
      (R.global.dcodeIO && R.global.dcodeIO.Long) ||
      R.global.Long ||
      R.inquire("long")),
    (R.key2Re = /^true|false|0|1$/),
    (R.key32Re = /^-?(?:0|[1-9][0-9]*)$/),
    (R.key64Re = /^(?:[\\x00-\\xff]{8}|-?(?:0|[1-9][0-9]*))$/),
    (R.longToHash = function (t) {
      return t ? R.LongBits.from(t).toHash() : R.LongBits.zeroHash;
    }),
    (R.longFromHash = function (t, r) {
      var h = R.LongBits.fromHash(t);
      if (R.Long) return R.Long.fromBits(h.lo, h.hi, r);
      return h.toNumber(Boolean(r));
    }));
  function a(t, r, h) {
    for (var i = Object.keys(r), c = 0; c < i.length; ++c)
      if (t[i[c]] === void 0 || !h) t[i[c]] = r[i[c]];
    return t;
  }
  ((R.merge = a),
    (R.lcFirst = function (t) {
      return t.charAt(0).toLowerCase() + t.substring(1);
    }));
  function e(t) {
    function r(h, i) {
      if (!(this instanceof r)) return new r(h, i);
      if (
        (Object.defineProperty(this, "message", {
          get: function () {
            return h;
          },
        }),
        Error.captureStackTrace)
      )
        Error.captureStackTrace(this, r);
      else Object.defineProperty(this, "stack", { value: Error().stack || "" });
      if (i) a(this, i);
    }
    return (
      (r.prototype = Object.create(Error.prototype, {
        constructor: {
          value: r,
          writable: !0,
          enumerable: !1,
          configurable: !0,
        },
        name: {
          get: function () {
            return t;
          },
          set: void 0,
          enumerable: !1,
          configurable: !0,
        },
        toString: {
          value: function () {
            return this.name + ": " + this.message;
          },
          writable: !0,
          enumerable: !1,
          configurable: !0,
        },
      })),
      r
    );
  }
  ((R.newError = e),
    (R.ProtocolError = e("ProtocolError")),
    (R.oneOfGetter = function (t) {
      var r = {};
      for (var h = 0; h < t.length; ++h) r[t[h]] = 1;
      return function () {
        for (var i = Object.keys(this), c = i.length - 1; c > -1; --c)
          if (r[i[c]] === 1 && this[i[c]] !== void 0 && this[i[c]] !== null)
            return i[c];
      };
    }),
    (R.oneOfSetter = function (t) {
      return function (r) {
        for (var h = 0; h < t.length; ++h) if (t[h] !== r) delete this[t[h]];
      };
    }),
    (R.toJSONOptions = {
      longs: String,
      enums: String,
      bytes: String,
      json: !0,
    }),
    (R._configure = function () {
      var t = R.Buffer;
      if (!t) {
        R._Buffer_from = R._Buffer_allocUnsafe = null;
        return;
      }
      ((R._Buffer_from =
        (t.from !== Uint8Array.from && t.from) ||
        function (r, h) {
          return new t(r, h);
        }),
        (R._Buffer_allocUnsafe =
          t.allocUnsafe ||
          function (r) {
            return new t(r);
          }));
    }));
};
