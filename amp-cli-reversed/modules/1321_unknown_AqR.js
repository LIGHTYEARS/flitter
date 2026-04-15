async function AqR() {
  return new Promise(T => {
    let R = Q5T("git", ["--version"], {
        stdio: ["ignore", "pipe", "pipe"]
      }),
      a = setTimeout(() => {
        R.kill(), T(!1);
      }, 5000);
    R.on("close", e => {
      clearTimeout(a), T(e === 0);
    }), R.on("error", () => {
      clearTimeout(a), T(!1);
    });
  });
}