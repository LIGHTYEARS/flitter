function f$R(T) {
  let R = {},
    a = H(T, ["predictionsFormat"]);
  if (a != null) Y(R, ["format"], a);
  let e = H(T, ["gcsDestination", "outputUriPrefix"]);
  if (e != null) Y(R, ["gcsUri"], e);
  let t = H(T, ["bigqueryDestination", "outputUri"]);
  if (t != null) Y(R, ["bigqueryUri"], t);
  return R;
}