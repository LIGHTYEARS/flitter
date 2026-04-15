function nAR(T) {
  return jD("open", [T], {
    stdio: "ignore"
  });
}
function lAR(T) {
  try {
    let R = zR.parse(T);
    if (R.scheme !== "file") return {};
    let a = AAR(R.fragment);
    return {
      filePath: R.fsPath,
      line: a?.line,
      column: a?.column
    };
  } catch {
    return {};
  }
}