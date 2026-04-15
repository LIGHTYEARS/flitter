function sY(T) {
  return ["/opt/homebrew/Cellar/ampcode/", "/usr/local/Cellar/ampcode/", "/home/linuxbrew/.linuxbrew/Cellar/ampcode/"].some(R => T.includes(R));
}
async function DVT() {
  if (sY(process.execPath)) return "brew";
  if (MVT()) return "binary";
  if (process.env.AMP_HOME) return "bootstrap";
  try {
    let T = process.argv[1] || "";
    J.debug("Detecting package manager from script path", {
      currentScript: T
    });
    let R = T;
    try {
      R = await $b0(T), J.debug("Resolved path", {
        from: T,
        to: R
      });
    } catch (r) {
      J.debug("Error resolving path", {
        error: r
      });
    }
    if (J.debug("Resolved installation path", {
      actualPath: R
    }), sY(R)) return "brew";
    let a = ["pnpm", "yarn", "bun", "npm"];
    for (let r of a) try {
      let h = await Sb0(r);
      if (h.length === 0) continue;
      if (J.debug("package manager global paths found", {
        packageManager: r,
        globalPaths: h
      }), h.some(i => R.includes(i))) return r;
    } catch (h) {
      J.debug("Failed to query package manager global path", {
        packageManager: r,
        error: h
      });
    }
    J.debug("Checking installation directory for lockfiles");
    let e = hxT(hxT(R));
    J.debug("Checking installation directory", {
      installDir: e
    });
    let t = [{
      file: "pnpm-lock.yaml",
      manager: "pnpm"
    }, {
      file: "yarn.lock",
      manager: "yarn"
    }, {
      file: "bun.lockb",
      manager: "bun"
    }, {
      file: "package-lock.json",
      manager: "npm"
    }];
    for (let {
      file: r,
      manager: h
    } of t) try {
      let i = jb0(e, r);
      return J.debug("Checking for lockfile", {
        filePath: i
      }), await vb0(i), J.debug("Found package manager lockfile", {
        file: r,
        manager: h,
        filePath: i
      }), h;
    } catch (i) {
      J.debug("Lockfile not found", {
        file: r,
        error: i
      });
    }
    return J.debug("Could not determine package manager from node_modules path"), null;
  } catch (T) {
    return J.debug("Error detecting installed package manager", {
      error: T
    }), null;
  }
}