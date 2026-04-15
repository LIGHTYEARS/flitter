function gC0(T) {
  if (!fC0(T)) return T;
  let R = {
    url: T.url
  };
  if (T.headers) R.headers = T.headers;
  if (T.transport) R.transport = T.transport;
  if (T.oauth) {
    let a = IC0(T.oauth);
    if (a) R.oauth = a;
  }
  return R;
}