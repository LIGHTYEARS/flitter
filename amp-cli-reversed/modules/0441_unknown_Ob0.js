async function Ob0() {
  let T = process.env.npm_config_user_agent;
  if (T) {
    if (T.includes("pnpm")) return "pnpm";
    if (T.includes("yarn")) return "yarn";
    if (T.includes("bun")) return "bun";
    if (T.includes("npm")) return "npm";
  }
  if (process.env.PNPM_HOME || process.env.PNPM_SCRIPT_SRC_DIR) return "pnpm";
  if (process.env.YARN_WRAP_OUTPUT || process.env.YARNPKG_LOCKFILE_VERSION) return "yarn";
  if (process.env.BUN_INSTALL) return "bun";
  let [R, a, e, t] = await Promise.allSettled([M4("pnpm"), M4("yarn"), M4("bun"), M4("npm")]);
  if (R.status === "fulfilled" && R.value) return "pnpm";
  if (a.status === "fulfilled" && a.value) return "yarn";
  if (e.status === "fulfilled" && e.value) return "bun";
  if (t.status === "fulfilled" && t.value) return "npm";
  return null;
}