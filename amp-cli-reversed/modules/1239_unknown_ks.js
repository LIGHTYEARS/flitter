function zwR(T, R) {
  return Promise.race([T, new Promise((a, e) => setTimeout(() => e(Error("Snapshot git operation timed out")), R))]);
}
async function ks(T, R) {
  let {
    stdout: a
  } = await XWT("git", T, {
    cwd: R.cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      ...R.env
    },
    maxBuffer: 16777216
  });
  return a.trim();
}