async function AxT(T) {
  let {
    reason: R,
    output: a
  } = await fb(T, ["--version"]);
  if (R !== "success") {
    J.error("Failed to get current Bun version", {
      output: a
    });
    return;
  }
  let e = a.trim(),
    t = WVT(e);
  if (!t) {
    J.error("Failed to parse Bun version from output", {
      output: a
    });
    return;
  }
  return t;
}