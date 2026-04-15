function Vk0(T) {
  let R = T.split(";");
  if (R.length < 2 || R[0] !== "8") return null;
  let a = R[1] ?? "",
    e = R.slice(2).join(";");
  if (!e) return;
  let t = "";
  if (a) {
    let r = a.match(/id=([^:;]+)/);
    if (r) t = r[1] ?? "";
  }
  return {
    uri: e,
    id: t
  };
}