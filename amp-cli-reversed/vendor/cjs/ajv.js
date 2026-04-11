// Module: ajv
// Original: M9T
// Type: CJS (RT wrapper)
// Exports: Ajv, CodeGen, KeywordCxt, MissingRefError, Name, ValidationError, _, default, nil, str, stringify
// Category: util

// Module: M9T (CJS)
(T, R) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.MissingRefError =
      T.ValidationError =
      T.CodeGen =
      T.Name =
      T.nil =
      T.stringify =
      T.str =
      T._ =
      T.KeywordCxt =
      T.Ajv =
        void 0));
  var a = IMT(),
    e = quR(),
    t = CMT(),
    r = FuR(),
    h = ["/properties"],
    i = "http://json-schema.org/draft-07/schema";
  class c extends a.default {
    _addVocabularies() {
      if (
        (super._addVocabularies(),
        e.default.forEach((n) => this.addVocabulary(n)),
        this.opts.discriminator)
      )
        this.addKeyword(t.default);
    }
    _addDefaultMetaSchema() {
      if ((super._addDefaultMetaSchema(), !this.opts.meta)) return;
      let n = this.opts.$data ? this.$dataMetaSchema(r, h) : r;
      (this.addMetaSchema(n, i, !1),
        (this.refs["http://json-schema.org/schema"] = i));
    }
    defaultMeta() {
      return (this.opts.defaultMeta =
        super.defaultMeta() || (this.getSchema(i) ? i : void 0));
    }
  }
  ((T.Ajv = c),
    (R.exports = T = c),
    (R.exports.Ajv = c),
    Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.default = c));
  var s = sO();
  Object.defineProperty(T, "KeywordCxt", {
    enumerable: !0,
    get: function () {
      return s.KeywordCxt;
    },
  });
  var A = M9();
  (Object.defineProperty(T, "_", {
    enumerable: !0,
    get: function () {
      return A._;
    },
  }),
    Object.defineProperty(T, "str", {
      enumerable: !0,
      get: function () {
        return A.str;
      },
    }),
    Object.defineProperty(T, "stringify", {
      enumerable: !0,
      get: function () {
        return A.stringify;
      },
    }),
    Object.defineProperty(T, "nil", {
      enumerable: !0,
      get: function () {
        return A.nil;
      },
    }),
    Object.defineProperty(T, "Name", {
      enumerable: !0,
      get: function () {
        return A.Name;
      },
    }),
    Object.defineProperty(T, "CodeGen", {
      enumerable: !0,
      get: function () {
        return A.CodeGen;
      },
    }));
  var l = SN();
  Object.defineProperty(T, "ValidationError", {
    enumerable: !0,
    get: function () {
      return l.default;
    },
  });
  var o = oO();
  Object.defineProperty(T, "MissingRefError", {
    enumerable: !0,
    get: function () {
      return o.default;
    },
  });
};
