function UdR(T, R) {
  let a = {},
    e = H(T, ["sdkHttpResponse"]);
  if (e != null) Y(a, ["sdkHttpResponse"], e);
  let t = H(T, ["nextPageToken"]);
  if (t != null) Y(a, ["nextPageToken"], t);
  let r = H(T, ["tuningJobs"]);
  if (r != null) {
    let h = r;
    if (Array.isArray(h)) h = h.map(i => {
      return BK(i);
    });
    Y(a, ["tuningJobs"], h);
  }
  return a;
}