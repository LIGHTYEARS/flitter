function Eh() {
  return `T-${VS()}`;
}
function Vt(T) {
  return KET.safeParse(T).success;
}
function fx() {
  return `toolu_${crypto.randomUUID()}`;
}
function iN(T, R, a = fx()) {
  return {
    type: "tool_use",
    complete: !0,
    id: a,
    name: T,
    input: R
  };
}
function wlR(T) {
  if (!T || typeof T !== "object") return !1;
  return T.type === "text";
}
function S0T(T) {
  if (typeof T === "string") return {
    text: T,
    images: []
  };
  let R = T.filter(e => e.type === "text").map(e => e.text).join(`
`),
    a = T.filter(e => e.type === "image");
  return {
    text: R,
    images: a
  };
}