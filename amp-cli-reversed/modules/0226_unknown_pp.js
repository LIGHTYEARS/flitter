function m8() {
  return Vx("remote-manager-driver");
}
function qk(T) {
  return T.endpoint ?? "http://127.0.0.1:6420";
}
async function pp(T, R, a, e) {
  let t = qk(T),
    r = qaT(t, a, {
      namespace: T.namespace
    });
  m8().debug({
    msg: "making api call",
    method: R,
    url: r
  });
  let h = {
    ...T.headers
  };
  if (T.token) h.Authorization = `Bearer ${T.token}`;
  return await IeT({
    method: R,
    url: r,
    headers: h,
    body: e,
    encoding: "json",
    skipParseResponse: !1,
    requestVersionedDataHandler: void 0,
    requestVersion: void 0,
    responseVersionedDataHandler: void 0,
    responseVersion: void 0,
    requestZodSchema: K.any(),
    responseZodSchema: K.any(),
    requestToJson: i => i,
    requestToBare: i => i,
    responseFromJson: i => i,
    responseFromBare: i => i
  });
}