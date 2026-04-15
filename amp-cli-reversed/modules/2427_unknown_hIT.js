function hIT(T, R, a) {
  let e = Math.min(R, 512);
  if (a === "utf-16" || a === "utf-16le" || a === "utf-16be") {
    for (let t = 0; t < e; t += 2) {
      let r = T[t],
        h = t + 1 < e ? T[t + 1] : 0;
      if (a === "utf-16le" || a === "utf-16") {
        if (h === 0 && r < 32 && r !== 9 && r !== 10 && r !== 13 && r !== 0) return !1;
      }
      if (a === "utf-16be" || a === "utf-16") {
        if (r === 0 && h < 32 && h !== 9 && h !== 10 && h !== 13 && h !== 0) return !1;
      }
    }
    return !0;
  }
  if (a === "latin1" || a === "iso-8859-1") {
    for (let t = 0; t < e; t++) {
      let r = T[t];
      if (r === 0) return !1;
      if (r < 32 && r !== 9 && r !== 10 && r !== 13) return !1;
    }
    return !0;
  }
  if (a === "cjk" || a === "big5" || a === "gb2312" || a === "gbk" || a === "euc-kr" || a === "shift-jis") {
    for (let t = 0; t < e; t++) {
      let r = T[t];
      if (r === 0) return !1;
      if (r < 32 && r !== 9 && r !== 10 && r !== 13) return !1;
    }
    return !0;
  }
  return !1;
}