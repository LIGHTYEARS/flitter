function o$(T, R) {
  if (!T) return {};
  if (T.enum && T.enum.length > 0) return T.enum[0];
  if (T.default !== void 0) return T.default;
  if (T.anyOf && T.anyOf.length > 0) return o$(T.anyOf[0], R);
  if (T.oneOf && T.oneOf.length > 0) return o$(T.oneOf[0], R);
  switch (Array.isArray(T.type) ? T.type[0] : T.type) {
    case "string":
      return $7R(T.format, R);
    case "number":
      return 3.14;
    case "integer":
      return 42;
    case "boolean":
      return !0;
    case "null":
      return null;
    case "array":
      {
        if (T.items) return [o$(T.items)];
        return [];
      }
    case "object":
      {
        let a = {};
        if (T.properties) for (let [e, t] of Object.entries(T.properties)) a[e] = o$(t, e);
        return a;
      }
    default:
      return {};
  }
}