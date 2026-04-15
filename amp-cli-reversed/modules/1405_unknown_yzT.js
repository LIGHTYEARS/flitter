function yzT(T, R) {
  if (yzR.has(T)) return !0;
  if (T === "sed" && R.some(a => a.startsWith("-i") || a === "--in-place")) return !0;
  if (T === "perl" && R.some(a => /^-p[ie]/.test(a))) return !0;
  if (T === "find" && R.some(a => kzR.has(a))) return !0;
  return !1;
}