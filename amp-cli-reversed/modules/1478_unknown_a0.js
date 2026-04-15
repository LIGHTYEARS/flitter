function zvT(T) {
  if (jb(T)) return {
    ...T
  };
  if (Array.isArray(T)) return [...T];
  return T;
}
function viR(T) {
  let R = 0;
  for (let a in T) if (Object.prototype.hasOwnProperty.call(T, a)) R++;
  return R;
}
function Xo(T) {
  return T.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function di(T, R, a) {
  let e = new T._zod.constr(R ?? T._zod.def);
  if (!R || a?.parent) e._zod.parent = T;
  return e;
}
function a0(T) {
  let R = T;
  if (!R) return {};
  if (typeof R === "string") return {
    error: () => R
  };
  if (R?.message !== void 0) {
    if (R?.error !== void 0) throw Error("Cannot specify both `message` and `error` params");
    R.error = R.message;
  }
  if (delete R.message, typeof R.error === "string") return {
    ...R,
    error: () => R.error
  };
  return R;
}