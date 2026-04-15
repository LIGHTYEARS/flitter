function IQ(T, R, a) {
  if (R && typeof T === "string") {
    let e = T.trim();
    if (e === "true") return !0;else if (e === "false") return !1;else return Aw0(T, a);
  } else if (Q70(T)) return T;else return "";
}