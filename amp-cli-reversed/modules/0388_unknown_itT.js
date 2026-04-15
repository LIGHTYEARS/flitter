function itT(T) {
  if (T instanceof Error) return T.stack ?? T.message;
  if (typeof T === "string") {
    let R = Qp0(T);
    if (R !== null) return JSON.stringify(R, null, 2);
    return T;
  }
  if (T === void 0) return "";
  try {
    return JSON.stringify(T, null, 2);
  } catch {
    return String(T);
  }
}