function hp(T) {
  return w8T(T);
}
function m$R(T) {
  return T !== null && T !== void 0 && typeof T === "object" && "name" in T;
}
function QBT(T) {
  return T !== null && T !== void 0 && typeof T === "object" && "video" in T;
}
function ZBT(T) {
  return T !== null && T !== void 0 && typeof T === "object" && "uri" in T;
}
function z8T(T) {
  var R;
  let a;
  if (m$R(T)) a = T.name;
  if (ZBT(T)) {
    if (a = T.uri, a === void 0) return;
  }
  if (QBT(T)) {
    if (a = (R = T.video) === null || R === void 0 ? void 0 : R.uri, a === void 0) return;
  }
  if (typeof T === "string") a = T;
  if (a === void 0) throw Error("Could not extract file name from the provided input.");
  if (a.startsWith("https://")) {
    let e = a.split("files/")[1].match(/[a-z0-9]+/);
    if (e === null) throw Error(`Could not extract file name from URI ${a}`);
    a = e[0];
  } else if (a.startsWith("files/")) a = a.split("files/")[1];
  return a;
}