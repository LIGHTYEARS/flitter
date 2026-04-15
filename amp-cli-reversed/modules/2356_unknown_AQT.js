function gj0() {
  return "!";
}
function AQT(T, R, a) {
  let e = T.value || "",
    t = "`",
    r = -1;
  while (new RegExp("(^|[^`])" + t + "([^`]|$)").test(e)) t += "`";
  if (/[^ \r\n]/.test(e) && (/^[ \r\n]/.test(e) && /[ \r\n]$/.test(e) || /^`|`$/.test(e))) e = " " + e + " ";
  while (++r < a.unsafe.length) {
    let h = a.unsafe[r],
      i = a.compilePattern(h),
      c;
    if (!h.atBreak) continue;
    while (c = i.exec(e)) {
      let s = c.index;
      if (e.charCodeAt(s) === 10 && e.charCodeAt(s - 1) === 13) s--;
      e = e.slice(0, s) + " " + e.slice(c.index + 1);
    }
  }
  return t + e + t;
}