function qgT(T) {
  let R = T.visibility || "",
    a = T.type ? `: ${T.type}` : "";
  return `${R}${T.name}${a}`;
}
function l50(T) {
  let R = [];
  if (T.annotation) R.push(`<<${T.annotation}>>`);
  R.push(T.label);
  let a = T.attributes.map(qgT),
    e = T.methods.map(qgT);
  if (a.length === 0 && e.length === 0) return [R];
  if (e.length === 0) return [R, a];
  return [R, a, e];
}