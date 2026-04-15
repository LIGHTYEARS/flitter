function ii(T) {
  if (typeof T === "string") return T === "__proto__" ? "__proto_" : T;
  if (typeof T === "number" || typeof T === "boolean" || typeof T === "bigint") return T.toString();
  if (T == null) return T + "";
  throw Error("Invalid property name type " + typeof T);
}