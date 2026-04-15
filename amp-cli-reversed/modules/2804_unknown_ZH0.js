function ZH0() {
  try {
    let T = QH0();
    if (T.length === 0) return {
      success: !1,
      products: [],
      helpMessage: "Directory does not exist. Please ensure you have JetBrains IDEs installed."
    };
    J.debug("jetbrains-plugin-discovery", {
      productDirectories: T
    });
    let R = [];
    for (let a of T) {
      let {
        productName: e,
        version: t
      } = TW0(a.name);
      if (["2020", "2021", "2022", "2023", "unknown"].find(r => t.startsWith(r))) {
        J.debug("jetbrains-plugin-discovery", {
          skipped: a.name
        });
        continue;
      }
      R.push({
        name: e,
        version: t,
        pluginDirectory: kA.join(a.parentPath, a.name, "plugins", q0R)
      });
    }
    return {
      success: !0,
      products: R.sort((a, e) => {
        return a.name.localeCompare(e.name) || a.version.localeCompare(e.version);
      })
    };
  } catch (T) {
    J.error("jetbrains-plugin-discovery", {
      error: T
    });
    let R = ehT(),
      a = `Failed to access JetBrains directory at: ${[IB("JetBrains"), IB("Google")].join(", ")}
`;
    if (T instanceof Error && "code" in T) switch (T.code) {
      case "EACCES":
        a += "Permission denied. Please check directory permissions.";
        break;
      default:
        a += `Error: ${T.message}`;
    } else a += `Error: ${String(T)}`;
    if (R === "darwin") a += `
On macOS, JetBrains IDEs are typically installed in ~/Library/Application Support/JetBrains/`;else if (R === "win32") a += `
On Windows, check %APPDATA%\\JetBrains\\`;
    return {
      success: !1,
      products: [],
      error: T instanceof Error ? T.message : String(T),
      helpMessage: a
    };
  }
}