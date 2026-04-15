function Q1T(T, R) {
  let a = {},
    e = {};
  for (let t of T) Object.assign(a, t.property), Object.assign(e, t.normal);
  return new Rf(a, e, R);
}
function PS(T) {
  return T.toLowerCase();
}
class Tr {
  constructor(T, R) {
    this.attribute = R, this.property = T;
  }
}