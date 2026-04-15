function QxT() {
  let T = vk0();
  if (T) return T;
  let R = jk0();
  if (R) return {
    ...R,
    pixelWidth: 0,
    pixelHeight: 0
  };
  return null;
}
function vk0() {
  try {
    let T = (() => {
        throw Error("Cannot require module ffi-napi");
      })(),
      R = (() => {
        throw Error("Cannot require module ref-napi");
      })(),
      a = (() => {
        throw Error("Cannot require module ref-struct-di");
      })()(R)({
        ws_row: R.types.ushort,
        ws_col: R.types.ushort,
        ws_xpixel: R.types.ushort,
        ws_ypixel: R.types.ushort
      }),
      e = T.Library("libc", {
        ioctl: ["int", ["int", "ulong", "pointer"]]
      }),
      t = 1074295912,
      r = new a();
    if (e.ioctl(process.stdout.fd, t, r.ref()) === 0) return {
      rows: r.ws_row,
      columns: r.ws_col,
      pixelWidth: r.ws_xpixel,
      pixelHeight: r.ws_ypixel
    };
    return null;
  } catch (T) {
    return null;
  }
}