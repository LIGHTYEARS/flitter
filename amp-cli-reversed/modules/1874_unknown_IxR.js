function IxR(T, R) {
  let a = T;
  if (Array.isArray(T)) a = T.filter(r => {
    if (r && typeof r === "object" && "type" in r && r.type === "image") return !1;
    return !0;
  });
  if (R.truncateToolResults) a = a8T(a);
  let e = JSON.stringify(a) ?? "undefined",
    t = Buffer.byteLength(e, "utf8");
  if (t > 102400) {
    let r = Math.round(100),
      h = Math.round(t / 1024);
    if (Array.isArray(a)) return [`[Tool result truncated: ${h}KB exceeds limit of ${r}KB. Please refine the query.]`];
    return `[Tool result truncated: ${h}KB exceeds limit of ${r}KB. Please refine the query.]`;
  }
  return a;
}