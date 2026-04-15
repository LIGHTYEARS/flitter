function XVT(T, R) {
  Lw = T, VVT = R;
}
function IH() {
  return Lw;
}
function jm0() {
  return VVT;
}
function Sm0(T, R, a) {
  if (Lw === "unknown") return null;
  if (T.type !== "rgb" || R.type !== "rgb") return null;
  let e = Lw === "light" ? 0.15 : 0.12,
    t = r => {
      if (r.type === "rgb") return {
        ...r,
        alpha: e
      };
      if (r.type === "index") return {
        ...r,
        alpha: e
      };
      return {
        type: "default",
        alpha: e
      };
    };
  return {
    added: t(T),
    removed: t(R)
  };
}