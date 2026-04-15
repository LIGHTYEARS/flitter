async function fz0(T) {
  return new Promise(R => {
    m70("git", ["branch", "--show-current"], {
      cwd: T
    }, (a, e) => {
      if (a) {
        R(null);
        return;
      }
      let t = e.trim();
      R(t || null);
    });
  });
}