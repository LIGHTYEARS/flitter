function kxR(T) {
  let R = [`**Tool Use:** \`${T.name}\``],
    a = xxR(T.name, T.input),
    e = JSON.stringify(a, null, 2);
  return R.push("```json\n" + e + "\n```"), R.join(`

`);
}
function xxR(T, R) {
  if (T !== "edit_file" || typeof R !== "object" || R === null) return R;
  let a = R,
    e = {};
  for (let [t, r] of Object.entries(a)) if (t === "old_str") e[t] = "[... old_str omitted in markdown version ...]";else if (t === "new_str") e[t] = "[... new_str omitted in markdown version ...]";else e[t] = r;
  return e;
}