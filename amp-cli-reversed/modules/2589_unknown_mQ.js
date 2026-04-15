function rM0(T) {
  return typeof T === "object" && T !== null && "type" in T && typeof T.type === "string";
}
function mQ(T, R) {
  if (!rM0(R)) return null;
  let a = {
    key: T,
    type: R.type,
    description: R.description,
    children: []
  };
  if (a.type === "object") a.children = Object.entries(R.properties ?? {}).map(([e, t]) => mQ(T ? `${T}.${e}` : e, t)).filter(e => e !== null);else if (a.type === "array" && R.items) {
    if (a.type = `array of ${R.items.type}`, R.items.type === "object") a.children = mQ(null, R.items)?.children ?? [];
  }
  return a;
}