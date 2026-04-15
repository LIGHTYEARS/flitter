function G4R(T) {
  return T.status !== void 0 && T.status >= 500;
}
function K4R(T) {
  return T.message.startsWith("InvalidModelOutputError");
}
function V4R(T) {
  let R = T.message?.toLowerCase() ?? "",
    a = T.error?.message?.toLowerCase() ?? "";
  return ["response incomplete", "stream ended unexpectedly", "stream closed before"].some(e => R.includes(e) || a.includes(e));
}