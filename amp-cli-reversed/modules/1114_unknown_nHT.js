function nHT(T) {
  let R = T._state;
  if (R === "closed" || R === "errored") return m9(TypeError(`The stream (in ${R} state) is not in the writable state and cannot be closed`));
  let a = zt((r, h) => {
      let i = {
        _resolve: r,
        _reject: h
      };
      T._closeRequest = i;
    }),
    e = T._writer;
  var t;
  return e !== void 0 && T._backpressure && R === "writable" && H3T(e), C3T(t = T._writableStreamController, F3T, 0), $U(t), a;
}