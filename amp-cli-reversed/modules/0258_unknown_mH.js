function Vb() {
  return `M-${HeT(VS())}`;
}
function Nc0() {
  return `TU-${HeT(VS())}`;
}
function bkT() {
  return `E-${HeT(VS())}`;
}
function bo0(T) {
  if (typeof T !== "string") return !1;
  return _o0.has(T);
}
function mH(T, R) {
  if (T && typeof T === "object" && "type" in T) {
    let e = T;
    if (e.type === "delta" || e.type === "snapshot") return e;
  }
  if (R === "snapshot") return {
    type: "snapshot",
    value: T
  };
  let a = typeof T === "string" ? T : T !== void 0 ? JSON.stringify(T) : "";
  return {
    type: "delta",
    blocks: a ? [{
      type: "text",
      text: a
    }] : void 0,
    state: "generating"
  };
}