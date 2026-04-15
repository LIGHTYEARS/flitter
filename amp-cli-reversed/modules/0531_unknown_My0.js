function Ly0(T, R) {
  uY = T, yY = R;
}
function cXT() {
  return typeof process < "u" && (process.env.BUN_TEST === "1" || globalThis.Bun?.jest !== void 0 || typeof globalThis.test === "function");
}
function My0() {
  if (!uY) {
    if (cXT()) return {
      scheduleBuildFor: () => {}
    };
    throw Error("Build scheduler not initialized. Make sure WidgetsBinding is created.");
  }
  return uY;
}