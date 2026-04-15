async function a4(T, R) {
  let {
    stdout: a
  } = await V2R("git", T, {
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