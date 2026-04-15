function BmR(T) {
  if (gN(T)) {
    let e = T._zod?.def;
    if (e) {
      if (e.value !== void 0) return e.value;
      if (Array.isArray(e.values) && e.values.length > 0) return e.values[0];
    }
  }
  let R = T._def;
  if (R) {
    if (R.value !== void 0) return R.value;
    if (Array.isArray(R.values) && R.values.length > 0) return R.values[0];
  }
  let a = T.value;
  if (a !== void 0) return a;
  return;
}