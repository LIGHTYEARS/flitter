function LST(T) {
  let R = new $3({
    check: "meta"
  });
  return R._zod.onattach = [a => {
    let e = Ph.get(a) ?? {};
    Ph.add(a, {
      ...e,
      ...T
    });
  }], R._zod.check = () => {}, R;
}