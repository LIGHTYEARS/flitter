function W7R(T) {
  try {
    return NWT.parse(T);
  } catch (R) {
    return J.error("Invalid scaffold customization data", {
      error: R,
      data: T
    }), null;
  }
}
function q7R(T, {
  enableToolSpecs: R,
  disableTools: a
}) {
  let e = R ? T.filter(t => R?.some(r => r.name === t.name)) : [...T];
  if (a && a.length > 0) e = e.filter(t => !a.includes(t.name));
  if (R && R.length > 0) for (let t of R) {
    let r = e.findIndex(i => i.name === t.name);
    if (r < 0) throw Error(`Tool spec ${t.name} not found in original list`);
    let h = {
      ...e[r],
      ...t
    };
    e[r] = h;
  }
  return J.debug("Adjusted tool specs"), e;
}