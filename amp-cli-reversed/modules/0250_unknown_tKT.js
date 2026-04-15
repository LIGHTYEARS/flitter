async function tKT(T) {
  try {
    let {
        stdout: R
      } = await gc0("git", ["remote", "get-url", "origin"], {
        cwd: T
      }),
      a = R.trim();
    if (!a) return null;
    return vc0(a);
  } catch {
    return null;
  }
}