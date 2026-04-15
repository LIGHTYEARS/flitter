function db0(T, R) {
  let a = R ? `@sourcegraph/amp@${R}` : "@sourcegraph/amp";
  switch (T) {
    case "npm":
      return ["npm", ["install", "-g", a]];
    case "pnpm":
      return ["pnpm", ["add", "-g", a]];
    case "yarn":
      return ["yarn", ["global", "add", a]];
    case "bun":
      return ["bun", ["add", "-g", a]];
    case "brew":
      return ["brew", ["upgrade", "ampcode/tap/ampcode"]];
    case "bootstrap":
      throw Error("Bootstrap updates are handled separately");
    case "binary":
      throw Error("Binary updates are handled separately");
  }
}