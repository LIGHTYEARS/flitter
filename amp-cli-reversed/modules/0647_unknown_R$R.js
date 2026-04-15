function w8T(T) {
  if (typeof T !== "string") throw Error("fromImageBytes must be a string");
  return T;
}
function R$R(T) {
  let R = {},
    a = H(T, ["operationName"]);
  if (a != null) Y(R, ["operationName"], a);
  let e = H(T, ["resourceName"]);
  if (e != null) Y(R, ["_url", "resourceName"], e);
  return R;
}