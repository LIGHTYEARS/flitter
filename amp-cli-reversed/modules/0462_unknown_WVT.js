function WVT(T) {
  let R = T.replace(/^v/, ""),
    [a, e, t] = R.split(".").map(Number);
  if (a === void 0 || e === void 0 || t === void 0) return;
  if (Number.isNaN(a) || Number.isNaN(e) || Number.isNaN(t)) return;
  return [a, e, t];
}