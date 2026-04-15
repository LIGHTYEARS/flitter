function f$(T) {
  let R = IH() === "light";
  if (T === "smart") return R ? LT.rgb(0, 140, 70) : LT.rgb(0, 255, 136);
  if (T === "rush") return R ? LT.rgb(180, 100, 0) : LT.rgb(255, 215, 0);
  let a = xi(T)?.uiHints?.secondaryColor;
  if (a) return LT.rgb(a.r, a.g, a.b);
  return Fx0(T);
}