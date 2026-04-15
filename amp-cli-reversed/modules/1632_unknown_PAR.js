async function PAR(T) {
  try {
    let R = zR.parse(T);
    if (R.scheme !== "file") return;
    return await lk.promises.readFile(R.fsPath, "utf-8");
  } catch (R) {
    J.debug("Failed to read VS Code active file content", {
      fileURI: T,
      error: R instanceof Error ? R.message : String(R)
    });
    return;
  }
}