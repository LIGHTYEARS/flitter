function f50(T) {
  if (T?.status === "done" && typeof T.result === "object" && "files" in T.result && Array.isArray(T.result.files)) return T.result;
  return;
}
function I50(T) {
  return T?.status === "error" && typeof T.error === "object" && "message" in T.error;
}
function g50(T) {
  if (typeof T !== "object" || T === null || Array.isArray(T)) return null;
  let R = T,
    a = null;
  for (let e of Object.values(R)) {
    if (!Array.isArray(e) || e.length < 2) continue;
    let t = e[0];
    if (typeof t !== "object" || t === null || Array.isArray(t)) continue;
    if (a !== null) return null;
    a = e;
  }
  return a;
}