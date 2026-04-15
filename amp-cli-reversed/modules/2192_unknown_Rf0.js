function Rf0(T, R, a, e) {
  let t = tYT(T, a),
    r;
  if (e === null || e === void 0) return;
  if (typeof e === "number") {
    if (Number.isNaN(e)) return;
    r = e;
  } else if (typeof e === "boolean") r = e;else if (typeof e === "string") {
    if (t.spaceSeparated) r = pfT(e);else if (t.commaSeparated) r = lfT(e);else if (t.commaOrSpaceSeparated) r = pfT(lfT(e).join(" "));else r = _fT(t, t.property, e);
  } else if (Array.isArray(e)) r = [...e];else r = t.property === "style" ? af0(e) : String(e);
  if (Array.isArray(r)) {
    let h = [];
    for (let i of r) h.push(_fT(t, t.property, i));
    r = h;
  }
  if (t.property === "className" && Array.isArray(R.className)) r = R.className.concat(r);
  R[t.property] = r;
}