function FP(T) {
  if (!Xb()) return T;
  return `\x1BPtmux;${T.replace(/\x1b/g, "\x1B\x1B")}\x1B\\`;
}
function RXT() {
  return Gu0("bun:ffi");
}
function Ku0() {
  let {
    dlopen: T,
    FFIType: R
  } = RXT();
  return T("kernel32.dll", {
    GetConsoleMode: {
      args: [R.u64, R.ptr],
      returns: R.i32
    },
    GetStdHandle: {
      args: [R.i32],
      returns: R.u64
    },
    SetConsoleMode: {
      args: [R.u64, R.u32],
      returns: R.i32
    }
  });
}