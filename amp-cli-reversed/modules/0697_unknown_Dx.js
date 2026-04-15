function Dx(T) {
  if (T === void 0 || T === null) throw Error("tools is required");
  if (!Array.isArray(T)) throw Error("tools is required and must be an array of Tools");
  let R = [];
  for (let a of T) R.push(a);
  return R;
}