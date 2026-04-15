function fU(T) {
  let R = ["overloaded", "overload"],
    a = R.some(r => T.message?.toLowerCase().includes(r.toLowerCase())),
    e = Boolean(T.error?.message && R.some(r => T.error?.message?.toLowerCase().includes(r.toLowerCase()))),
    t = T.error?.type === "overloaded_error";
  return a || e || t;
}