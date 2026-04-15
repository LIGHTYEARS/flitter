function E4(T, R) {
  if (!(T instanceof Error)) return !1;
  return "code" in T && T.code === R;
}
function DkT(T) {
  if (T instanceof Error) return T.message;
  return String(T);
}
async function CA0(T) {
  let R = await Hs(),
    a = Vt(T) ? T : Eh(),
    e = await WWT({
      filesystem: He
    }, R, a);
  return {
    ...R,
    ...e,
    updatedAt: new Date().toISOString()
  };
}