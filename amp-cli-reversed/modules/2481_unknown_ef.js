function EE0(T) {
  switch (T.type) {
    case "file":
      return;
    case "hint":
      return;
    case "commit":
      return;
  }
}
function CE0(T) {
  switch (T) {
    case "commit":
      return "@:";
    case "thread":
      return "@@";
  }
}
class ef {
  detect(T, R) {
    if (!T || R < 1) return null;
    let a = B9(T);
    if (R > a.length) return null;
    let e = this.findWordStart(a, R);
    if (e >= a.length || a[e] !== "@") return null;
    let t = a.slice(e + 1, R).join("");
    if (t.includes(" ") || t.includes("\t") || t.includes(`
`)) return null;
    return {
      start: e,
      end: R,
      query: t,
      trigger: "@"
    };
  }
  findWordStart(T, R) {
    let a = R;
    for (let e = R - 1; e >= 0; e--) {
      let t = T[e];
      if (!t || /[\s([{]/.test(t)) {
        a = e + 1;
        break;
      }
      if (e === 0) a = 0;
    }
    return a;
  }
}