async function VHR(T) {
  let R = LHR("sha256"),
    a = await BHR(T);
  return R.update(a), R.digest("hex");
}
function XHR() {
  let T = process.env.npm_config_arch || iz.arch();
  switch (iz.platform()) {
    case "darwin":
      return T === "arm64" ? "aarch64-apple-darwin" : "x86_64-apple-darwin";
    case "win32":
      return T === "x64" ? "x86_64-pc-windows-msvc" : T === "arm64" ? "aarch64-pc-windows-msvc" : "i686-pc-windows-msvc";
    case "linux":
      return T === "x64" ? "x86_64-unknown-linux-musl" : T === "arm" ? "arm-unknown-linux-gnueabihf" : T === "armv7l" ? "arm-unknown-linux-gnueabihf" : T === "arm64" ? "aarch64-unknown-linux-musl" : T === "ppc64" ? "powerpc64le-unknown-linux-gnu" : T === "riscv64" ? "riscv64gc-unknown-linux-gnu" : T === "s390x" ? "s390x-unknown-linux-gnu" : "i686-unknown-linux-musl";
    default:
      throw Error("Unknown platform: " + iz.platform());
  }
}