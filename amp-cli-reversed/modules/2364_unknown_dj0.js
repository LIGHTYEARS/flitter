function dj0(T, R, a, e) {
  let t = a.enter("list"),
    r = a.bulletCurrent,
    h = T.ordered ? Oj0(a) : rrT(a),
    i = T.ordered ? h === "." ? ")" : "." : Sj0(a),
    c = R && a.bulletLastUsed ? h === a.bulletLastUsed : !1;
  if (!T.ordered) {
    let A = T.children ? T.children[0] : void 0;
    if ((h === "*" || h === "-") && A && (!A.children || !A.children[0]) && a.stack[a.stack.length - 1] === "list" && a.stack[a.stack.length - 2] === "listItem" && a.stack[a.stack.length - 3] === "list" && a.stack[a.stack.length - 4] === "listItem" && a.indexStack[a.indexStack.length - 1] === 0 && a.indexStack[a.indexStack.length - 2] === 0 && a.indexStack[a.indexStack.length - 3] === 0) c = !0;
    if (mQT(a) === h && A) {
      let l = -1;
      while (++l < T.children.length) {
        let o = T.children[l];
        if (o && o.type === "listItem" && o.children && o.children[0] && o.children[0].type === "thematicBreak") {
          c = !0;
          break;
        }
      }
    }
  }
  if (c) h = i;
  a.bulletCurrent = h;
  let s = a.containerFlow(T, e);
  return a.bulletLastUsed = h, a.bulletCurrent = r, t(), s;
}