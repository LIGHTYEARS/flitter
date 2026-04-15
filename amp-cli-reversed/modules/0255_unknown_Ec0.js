async function Ec0(T, R, a) {
  let e = await tKT(R);
  if (!e) return;
  let t;
  try {
    t = await T.get("defaultVisibility");
  } catch (h) {
    J.warn("Failed to read defaultVisibility setting", {
      error: h
    });
    return;
  }
  let r = t?.[e];
  return rKT(r, a, e);
}