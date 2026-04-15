function AN(T) {
  let R = T.toLowerCase();
  return R.includes("vscode") || R.includes("vs code") || R.includes("cursor") || R.includes("windsurf");
}
function epR(T) {
  return T.toLowerCase().includes("neovim");
}
function tpR(T) {
  return T.toLowerCase().includes("zed");
}
function rpR(T) {
  return G0T(T);
}
function ECT(T) {
  if (epR(T)) return "Neovim";else if (tpR(T)) return "Zed";else if (G0T(T)) return "JetBrains";else if (AN(T)) return "VS Code";
}
function ipR(T) {
  return T.map(R => NCT(R)).filter(R => R !== void 0).filter(R => aO(R.pid));
}
async function OD(T) {
  let R = Oj(process.cwd()),
    a = BCT(),
    e = ipR(a).filter(h => h.connection === "query" || !AN(h.ideName)),
    t = (await Promise.all(jj.map(async h => {
      try {
        return await h.listConfigs();
      } catch (i) {
        return J.debug("Failed to list query editor configs", {
          ideName: h.ideName,
          error: i instanceof Error ? i.message : String(i)
        }), [];
      }
    }))).flat(),
    r = e.concat(t);
  if (r.sort((h, i) => cpR(h, i, R)), T?.jetbrainsOnly) r = r.filter(h => G0T(h.ideName));
  if (T?.includeAll) return r;
  return spR(r, R) ?? r.filter(h => {
    return wCT(h, R);
  });
}