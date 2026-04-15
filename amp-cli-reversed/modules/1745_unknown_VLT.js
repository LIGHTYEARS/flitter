function FD(T) {
  if (T.status === "in-progress" || T.status === "done" || T.status === "cancelled" || T.status === "error") return T.progress;
  return;
}
function gN(T) {
  return !!T._zod;
}
function fl(T, R) {
  if (gN(T)) return XB(T, R);
  return T.safeParse(R);
}
function VLT(T) {
  if (!T) return;
  let R;
  if (gN(T)) R = T._zod?.def?.shape;else R = T.shape;
  if (!R) return;
  if (typeof R === "function") try {
    return R();
  } catch {
    return;
  }
  return R;
}