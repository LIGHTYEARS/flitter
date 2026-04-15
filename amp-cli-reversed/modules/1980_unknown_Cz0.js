async function Cz0() {
  for (let T of jj) try {
    if ((await T.listConfigs()).length > 0) return T;
  } catch (R) {
    J.debug("Failed to detect query-based IDE integration", {
      ideName: T.ideName,
      error: R
    });
  }
  return;
}