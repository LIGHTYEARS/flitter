async function eW0(T) {
  let R = await rhT(T),
    a = await G0R(),
    e = kA.join(process.cwd(), a);
  return J.debug("jetbrains-plugin-copy", {
    message: "Copying plugin to current directory",
    from: R,
    to: e
  }), await mH0(R, e), J.info("jetbrains-plugin-copy", {
    message: "Plugin copied successfully",
    path: e
  }), e;
}