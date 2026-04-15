function iy0(T) {
  return T.ctrlKey && T.key.toLowerCase() === "c" && T.eventType !== "repeat" && T.eventType !== "release";
}
function MxT(T) {
  try {
    let R = KVT(`tmux show-options -gv ${T}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 1000
    }).trim();
    return R === "" ? null : R;
  } catch {
    return null;
  }
}