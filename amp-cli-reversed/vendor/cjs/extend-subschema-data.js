// Module: extend-subschema-data
// Original: ouR
// Type: CJS (RT wrapper)
// Exports: extendSubschemaData, extendSubschemaMode, getSubschema
// Category: util

// Module: ouR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.extendSubschemaMode = T.extendSubschemaData = T.getSubschema = void 0));
  var R = M9(),
    a = a8();
  function e(
    h,
    {
      keyword: i,
      schemaProp: c,
      schema: s,
      schemaPath: A,
      errSchemaPath: l,
      topSchemaRef: o,
    },
  ) {
    if (i !== void 0 && s !== void 0)
      throw Error('both "keyword" and "schema" passed, only one allowed');
    if (i !== void 0) {
      let n = h.schema[i];
      return c === void 0
        ? {
            schema: n,
            schemaPath: R._`${h.schemaPath}${(0, R.getProperty)(i)}`,
            errSchemaPath: `${h.errSchemaPath}/${i}`,
          }
        : {
            schema: n[c],
            schemaPath: R._`${h.schemaPath}${(0, R.getProperty)(i)}${(0, R.getProperty)(c)}`,
            errSchemaPath: `${h.errSchemaPath}/${i}/${(0, a.escapeFragment)(c)}`,
          };
    }
    if (s !== void 0) {
      if (A === void 0 || l === void 0 || o === void 0)
        throw Error(
          '"schemaPath", "errSchemaPath" and "topSchemaRef" are required with "schema"',
        );
      return { schema: s, schemaPath: A, topSchemaRef: o, errSchemaPath: l };
    }
    throw Error('either "keyword" or "schema" must be passed');
  }
  T.getSubschema = e;
  function t(
    h,
    i,
    { dataProp: c, dataPropType: s, data: A, dataTypes: l, propertyName: o },
  ) {
    if (A !== void 0 && c !== void 0)
      throw Error('both "data" and "dataProp" passed, only one allowed');
    let { gen: n } = i;
    if (c !== void 0) {
      let { errorPath: _, dataPathArr: m, opts: b } = i,
        y = n.let("data", R._`${i.data}${(0, R.getProperty)(c)}`, !0);
      (p(y),
        (h.errorPath = R.str`${_}${(0, a.getErrorPath)(c, s, b.jsPropertySyntax)}`),
        (h.parentDataProperty = R._`${c}`),
        (h.dataPathArr = [...m, h.parentDataProperty]));
    }
    if (A !== void 0) {
      let _ = A instanceof R.Name ? A : n.let("data", A, !0);
      if ((p(_), o !== void 0)) h.propertyName = o;
    }
    if (l) h.dataTypes = l;
    function p(_) {
      ((h.data = _),
        (h.dataLevel = i.dataLevel + 1),
        (h.dataTypes = []),
        (i.definedProperties = new Set()),
        (h.parentData = i.data),
        (h.dataNames = [...i.dataNames, _]));
    }
  }
  T.extendSubschemaData = t;
  function r(
    h,
    {
      jtdDiscriminator: i,
      jtdMetadata: c,
      compositeRule: s,
      createErrors: A,
      allErrors: l,
    },
  ) {
    if (s !== void 0) h.compositeRule = s;
    if (A !== void 0) h.createErrors = A;
    if (l !== void 0) h.allErrors = l;
    ((h.jtdDiscriminator = i), (h.jtdMetadata = c));
  }
  T.extendSubschemaMode = r;
};
