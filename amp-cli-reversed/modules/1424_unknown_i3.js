function gzT(T) {
  return T.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}
function i3(T, R) {
  let a = `<${R}>`,
    e = `</${R}>`,
    t = T.indexOf(a);
  if (t === -1) return null;
  let r = t + a.length,
    h = T.indexOf(e, r);
  if (h === -1) return null;
  return gzT(T.slice(r, h).trim());
}