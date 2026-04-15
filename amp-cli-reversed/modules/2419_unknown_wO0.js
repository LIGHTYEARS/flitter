function wO0(T, R) {
  let a = !1,
    e = [];
  while (R < T.length) {
    let t = T[R];
    if (a) {
      if (t[0] === "enter") {
        if (t[1].type === "tableContent") e.push(T[R + 1][1].type === "tableDelimiterMarker" ? "left" : "none");
      } else if (t[1].type === "tableContent") {
        if (T[R - 1][1].type === "tableDelimiterMarker") {
          let r = e.length - 1;
          e[r] = e[r] === "left" ? "center" : "right";
        }
      } else if (t[1].type === "tableDelimiterRow") break;
    } else if (t[0] === "enter" && t[1].type === "tableDelimiterRow") a = !0;
    R += 1;
  }
  return e;
}