async function id0(T, R) {
  try {
    let a = R.split(" ").at(0);
    if (a === void 0) return !1;
    let e = T.getPlatform() === "win32" ? `where "${a}"` : `which "${a}"`;
    return T.execSync(e, {
      stdio: "ignore",
      timeout: 3000
    }), !0;
  } catch {
    return !1;
  }
}