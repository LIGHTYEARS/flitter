function TW0(T) {
  let R = T.match(/^(.+?)(\d{4}\.\d+(?:\.\d+)?)$/);
  if (!R) return {
    productName: T,
    version: "unknown"
  };
  let a = R[1],
    e = R[2];
  if (!a || !e) return {
    productName: T,
    version: "unknown"
  };
  return {
    productName: JH0(a),
    version: e
  };
}