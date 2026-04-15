function HAR(T) {
  try {
    if (!T.startsWith("file://")) return {};
    let R = zR.parse(T),
      a = WAR(R.fragment);
    return {
      filePath: R.fsPath,
      line: a?.line,
      column: a?.column
    };
  } catch {
    return {};
  }
}