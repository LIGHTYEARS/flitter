function vx0(T) {
  let R = typeof T.path === "string" ? T.path.trim() : void 0;
  if (!R) return "List";
  let a = R === "/" ? R : R.replace(/\/+$/, "");
  return `List ${a.includes("/") ? qA(a) || a : a}`;
}