async function Sb0(T) {
  switch (T) {
    case "npm":
      {
        let R = await fb("npm", ["list", "-g", "-p"]);
        if (R.reason !== "success") return J.debug("Failed to get npm global path", {
          result: R
        }), ["/usr/local/lib/node_modules/"];
        if (!R.output) return ["/usr/local/lib/node_modules/"];
        let a = `/usr/local/lib/node_modules/
${R.output}`.split(`
`).map(e => e.trim()).filter(e => e).sort();
        return a.filter((e, t) => {
          let r = a[t + 1];
          return !r || !r.includes(e);
        });
      }
    case "pnpm":
      {
        let R = await fb("pnpm", ["list", "-g", "--json"]);
        if (R.reason !== "success") return J.debug("Failed to get pnpm global path", {
          result: R
        }), [];
        let a = JSON.parse(R.output);
        if (Array.isArray(a) && a[0]?.path) return [a[0].path];
        return [];
      }
    case "yarn":
      {
        let R = await fb("yarn", ["global", "dir"]);
        if (R.reason !== "success") return J.debug("Failed to get yarn global path", {
          result: R
        }), [];
        return R.output ? [R.output] : [];
      }
    case "bun":
      return ["/.bun/install/global/"];
    case "brew":
      return [];
    case "bootstrap":
      return [];
    case "binary":
      return [];
  }
}