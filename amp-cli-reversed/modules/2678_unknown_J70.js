function Q70(T) {
  return typeof T < "u";
}
function J70(T, R) {
  R = Object.assign({}, Z70, R);
  let a = [],
    e = !1,
    t = !1;
  if (T[0] === "\uFEFF") T = T.substr(1);
  for (let r = 0; r < T.length; r++) if (T[r] === "<" && T[r + 1] === "?") {
    if (r += 2, r = agT(T, r), r.err) return r;
  } else if (T[r] === "<") {
    let h = r;
    if (r++, T[r] === "!") {
      r = egT(T, r);
      continue;
    } else {
      let i = !1;
      if (T[r] === "/") i = !0, r++;
      let c = "";
      for (; r < T.length && T[r] !== ">" && T[r] !== " " && T[r] !== "\t" && T[r] !== `
` && T[r] !== "\r"; r++) c += T[r];
      if (c = c.trim(), c[c.length - 1] === "/") c = c.substring(0, c.length - 1), r--;
      if (!iw0(c)) {
        let l;
        if (c.trim().length === 0) l = "Invalid space after '<'.";else l = "Tag '" + c + "' is an invalid name.";
        return ma("InvalidTag", l, ft(T, r));
      }
      let s = aw0(T, r);
      if (s === !1) return ma("InvalidAttr", "Attributes for '" + c + "' have open quote.", ft(T, r));
      let A = s.value;
      if (r = s.index, A[A.length - 1] === "/") {
        let l = r - A.length;
        A = A.substring(0, A.length - 1);
        let o = tgT(A, R);
        if (o === !0) e = !0;else return ma(o.err.code, o.err.msg, ft(T, l + o.err.line));
      } else if (i) {
        if (!s.tagClosed) return ma("InvalidTag", "Closing tag '" + c + "' doesn't have proper closing.", ft(T, r));else if (A.trim().length > 0) return ma("InvalidTag", "Closing tag '" + c + "' can't have attributes or invalid starting.", ft(T, h));else if (a.length === 0) return ma("InvalidTag", "Closing tag '" + c + "' has not been opened.", ft(T, h));else {
          let l = a.pop();
          if (c !== l.tagName) {
            let o = ft(T, l.tagStartPos);
            return ma("InvalidTag", "Expected closing tag '" + l.tagName + "' (opened in line " + o.line + ", col " + o.col + ") instead of closing tag '" + c + "'.", ft(T, h));
          }
          if (a.length == 0) t = !0;
        }
      } else {
        let l = tgT(A, R);
        if (l !== !0) return ma(l.err.code, l.err.msg, ft(T, r - A.length + l.err.line));
        if (t === !0) return ma("InvalidXml", "Multiple possible root nodes found.", ft(T, r));else if (R.unpairedTags.indexOf(c) !== -1) ;else a.push({
          tagName: c,
          tagStartPos: h
        });
        e = !0;
      }
      for (r++; r < T.length; r++) if (T[r] === "<") {
        if (T[r + 1] === "!") {
          r++, r = egT(T, r);
          continue;
        } else if (T[r + 1] === "?") {
          if (r = agT(T, ++r), r.err) return r;
        } else break;
      } else if (T[r] === "&") {
        let l = rw0(T, r);
        if (l == -1) return ma("InvalidChar", "char '&' is not expected.", ft(T, r));
        r = l;
      } else if (t === !0 && !RgT(T[r])) return ma("InvalidXml", "Extra text at the end", ft(T, r));
      if (T[r] === "<") r--;
    }
  } else {
    if (RgT(T[r])) continue;
    return ma("InvalidChar", "char '" + T[r] + "' is not expected.", ft(T, r));
  }
  if (!e) return ma("InvalidXml", "Start tag expected.", 1);else if (a.length == 1) return ma("InvalidTag", "Unclosed tag '" + a[0].tagName + "'.", ft(T, a[0].tagStartPos));else if (a.length > 0) return ma("InvalidXml", "Invalid '" + JSON.stringify(a.map(r => r.tagName), null, 4).replace(/\r?\n/g, "") + "' found.", {
    line: 1,
    col: 1
  });
  return !0;
}