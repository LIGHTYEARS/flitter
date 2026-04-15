function wdR(T, R) {
  let a = {},
    e = H(T, ["config"]);
  if (e != null) MdR(e, a);
  return a;
}
function BdR(T, R) {
  let a = {},
    e = H(T, ["config"]);
  if (e != null) DdR(e, a);
  return a;
}
function NdR(T, R) {
  let a = {},
    e = H(T, ["sdkHttpResponse"]);
  if (e != null) Y(a, ["sdkHttpResponse"], e);
  let t = H(T, ["nextPageToken"]);
  if (t != null) Y(a, ["nextPageToken"], t);
  let r = H(T, ["tunedModels"]);
  if (r != null) {
    let h = r;
    if (Array.isArray(h)) h = h.map(i => {
      return O6T(i);
    });
    Y(a, ["tuningJobs"], h);
  }
  return a;
}