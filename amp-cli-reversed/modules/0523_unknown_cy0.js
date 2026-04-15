function cy0() {
  try {
    let T = KVT("tmux display-message -p '#{client_termfeatures}'", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 1000
    }).trim();
    return T === "" ? [] : T.split(",").filter(Boolean);
  } catch {
    return null;
  }
}