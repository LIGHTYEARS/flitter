function M2(T, R) {
  let a = new Ug(R);
  if (a.push(T), a.err) throw a.msg || xA[a.err];
  return a.result;
}
function QpR(T, R) {
  return R = R || {}, R.raw = !0, M2(T, R);
}
function hbR(T) {
  if (T.proxy && !process.env.HTTP_PROXY && !process.env.http_proxy) process.env.HTTP_PROXY = T.proxy;
  if (T.proxy && !process.env.HTTPS_PROXY && !process.env.https_proxy) process.env.HTTPS_PROXY = T.proxy;
}