function x_0(T, R) {
  if (T === "mcpServers") return cY(R);
  if (iCT(T)) return k_0(T, R);
  return R.workspace ?? R.global ?? R.default;
}
async function kVT(T, R) {
  try {
    return await _S.access(T), T;
  } catch {
    if (T === R) {
      let a = Ih.join(Ih.dirname(T), "settings.jsonc");
      try {
        return await _S.access(a), J.info("Settings file not found, falling back to .jsonc", {
          jsonPath: T,
          jsoncPath: a
        }), a;
      } catch {
        return T;
      }
    }
    return T;
  }
}