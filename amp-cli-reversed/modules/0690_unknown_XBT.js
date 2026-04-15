function XBT(T) {
  if (T === null || T === void 0 || Array.isArray(T) && T.length === 0) throw Error("PartListUnion is required");
  if (Array.isArray(T)) return T.map(R => UAT(R));
  return [UAT(T)];
}