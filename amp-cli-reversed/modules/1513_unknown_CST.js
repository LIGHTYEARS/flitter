function EST(T, R) {
  let a = new $3({
    check: "custom",
    ...a0(R)
  });
  return a._zod.check = T, a;
}
function CST(T) {
  let R = new $3({
    check: "describe"
  });
  return R._zod.onattach = [a => {
    let e = Ph.get(a) ?? {};
    Ph.add(a, {
      ...e,
      description: T
    });
  }], R._zod.check = () => {}, R;
}