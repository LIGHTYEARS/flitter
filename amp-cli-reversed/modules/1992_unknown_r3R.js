async function r3R(T) {
  let R = I5T(32).toString("hex"),
    a = await Hw(T.ampURL, R),
    e = new AbortController();
  try {
    await Wb(a, e.signal);
  } catch (r) {
    J.error("Error opening browser", {
      error: r
    });
  }
  let t = await Hw(T.ampURL, R, !1);
  C9.write(`If your browser does not open automatically, visit:

${oR.blue.bold(t)}

`);
  try {
    return await rk0(T.ampURL, R, T.secrets, e), C9.write("\nLogin successful! Run `amp` to get started.\n"), !0;
  } catch (r) {
    return J.error("Login failed", {
      error: r
    }), Be.write(`
Login failed: ${r instanceof Error ? r.message : String(r)}
`), !1;
  }
}