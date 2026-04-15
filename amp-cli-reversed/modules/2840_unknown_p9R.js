function JW0(T) {
  let R = T?.path?.trim();
  if (!R) return "List";
  let a = R === "/" ? R : R.replace(/\/+$/, "");
  return `List ${(a.includes("/") ? xW0.posix.basename(a) : a) || a}`;
}
function ihT(T) {
  let R = T.filter(e => e.trim());
  if (R.length === 0) return;
  let a = 6;
  if (R.length <= a) return R.join(`
`);
  return `${R.slice(0, a).join(`
`)}
...`;
}
function p9R(T) {
  if (T.status !== "error" || !T.error) return;
  if (typeof T.error === "object" && "message" in T.error) {
    let R = T.error.message;
    if (typeof R === "string" && R.trim()) return R;
  }
  return String(T.error);
}