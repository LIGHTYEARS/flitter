async function RE0(T, R) {
  if (!R?.forceExternal && R?.onShowImagePreview && Yd0(T.filePath)) {
    R.onShowImagePreview(T.filePath);
    return;
  }
  if (await Us.openURIInIDE(T.openURI).catch(() => {
    return;
  })) return;
  if (await Rd0(T.filePath).catch(() => !1)) {
    await Wb(T.openURI);
    return;
  }
  try {
    await Zb(T.filePath, {
      line: T.line,
      column: T.column
    });
  } catch {
    await Wb(T.openURI);
  }
}