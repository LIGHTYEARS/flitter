function Ow0(T, R, a) {
  let e = a,
    t = 1;
  for (; a < T.length; a++) if (T[a] === "<") if (T[a + 1] === "/") {
    let r = sb(T, ">", a, `${R} is not closed`);
    if (T.substring(a + 2, r).trim() === R) {
      if (t--, t === 0) return {
        tagContent: T.substring(e, a),
        i: r
      };
    }
    a = r;
  } else if (T[a + 1] === "?") a = sb(T, "?>", a + 1, "StopNode is not closed.");else if (T.substr(a + 1, 3) === "!--") a = sb(T, "-->", a + 3, "StopNode is not closed.");else if (T.substr(a + 1, 2) === "![") a = sb(T, "]]>", a, "StopNode is not closed.") - 2;else {
    let r = fQ(T, a, ">");
    if (r) {
      if ((r && r.tagName) === R && r.tagExp[r.tagExp.length - 1] !== "/") t++;
      a = r.closeIndex;
    }
  }
}