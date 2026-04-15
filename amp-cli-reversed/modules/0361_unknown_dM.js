function Sw(T) {
  return typeof T === "object" && T !== null;
}
function aY(T) {
  if (!Array.isArray(T)) return;
  return T;
}
function zkT(T) {
  let R = T.trim();
  if (R.length === 0) return;
  try {
    let a = JSON.parse(R);
    return aY(a);
  } catch {
    return;
  }
}
function dM(T) {
  if (typeof T === "string") return T;
  if (!Sw(T)) return;
  if ("output" in T && typeof T.output === "string") return T.output;
  if ("displayMessage" in T && typeof T.displayMessage === "string") return T.displayMessage;
  if ("message" in T && typeof T.message === "string") return T.message;
  if ("reason" in T && typeof T.reason === "string") return T.reason;
  if ("result" in T) {
    let R = dM(T.result);
    if (R !== void 0) return R;
  }
  if ("error" in T) {
    let R = dM(T.error);
    if (R !== void 0) return R;
  }
  if ("value" in T) return dM(T.value);
  return;
}