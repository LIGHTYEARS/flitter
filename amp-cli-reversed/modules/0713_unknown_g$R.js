function g$R(T) {
  let R = {},
    a = H(T, ["instancesFormat"]);
  if (a != null) Y(R, ["format"], a);
  let e = H(T, ["gcsSource", "uris"]);
  if (e != null) Y(R, ["gcsUri"], e);
  let t = H(T, ["bigquerySource", "inputUri"]);
  if (t != null) Y(R, ["bigqueryUri"], t);
  return R;
}