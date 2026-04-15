function O7R(T) {
  if (!T) return !1;
  if (T.type === "object" && T.properties) return Object.keys(T.properties).length > 0;
  return !0;
}
function Tb(T) {
  if (!T) return ["unknown"];
  if (T.enum && T.enum.length > 0) return [T.enum.map(C7R).join(" | ")];
  if (T.anyOf && T.anyOf.length > 0) return [T.anyOf.map(R => Tb(R)[0]).join(" | ")];
  if (T.oneOf && T.oneOf.length > 0) return [T.oneOf.map(R => Tb(R)[0]).join(" | ")];
  if (Array.isArray(T.type)) return [T.type.map(R => Tb({
    type: R
  })[0]).join(" | ")];
  switch (T.type) {
    case "string":
      return ["string"];
    case "number":
    case "integer":
      return ["number"];
    case "boolean":
      return ["boolean"];
    case "array":
      {
        let R = Tb(T.items);
        if (R.length === 1) return [`${R[0]}[]`];
        let a = [`(${R[0]}`];
        for (let t = 1; t < R.length; t += 1) {
          let r = R[t];
          if (r !== void 0) a.push(r);
        }
        let e = a.at(-1) ?? "";
        return a[a.length - 1] = `${e})[]`, a;
      }
    case "object":
      return d7R(T);
    default:
      return ["unknown"];
  }
}