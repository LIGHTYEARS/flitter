function $j0() {
  return "`";
}
function pQT(T, R) {
  let a = RrT(T);
  return Boolean(!R.options.resourceLink && T.url && !T.title && T.children && T.children.length === 1 && T.children[0].type === "text" && (a === T.url || "mailto:" + a === T.url) && /^[a-z][a-z+.-]+:/i.test(T.url) && !/[\0- <>\u007F]/.test(T.url));
}