async function UeT(T, R, a, e) {
  if (e) return e;
  if (!dc0(a)) return pkT(a);
  let t = await Ec0(T, R, a);
  if (t instanceof Error) return t;
  return t ?? pkT(a);
}
function Cc0(T, R) {
  return rKT(T, R);
}
async function Lc0(T, R, a) {
  let e = await tKT(R);
  if (!e) return Error("No git origin remote found for this repository.");
  let t = {
    ...((await T.get("defaultVisibility", "global")) ?? {}),
    [e]: a
  };
  return await T.set("defaultVisibility", t, "global"), {
    repoKey: e
  };
}