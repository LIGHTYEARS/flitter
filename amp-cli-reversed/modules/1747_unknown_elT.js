function qp(T) {
  return T === "completed" || T === "failed" || T === "cancelled";
}
function elT(T) {
  let R = VLT(T)?.method;
  if (!R) throw Error("Schema is missing a method literal");
  let a = BmR(R);
  if (typeof a !== "string") throw Error("Schema method literal must be a string");
  return a;
}