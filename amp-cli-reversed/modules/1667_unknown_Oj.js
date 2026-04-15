function Oj(T) {
  let R;
  if (T.startsWith("file://")) R = zR.parse(T);else T = T.replaceAll("\\", "/"), R = zR.file(T);
  try {
    let e = Sj.realpathSync(R.fsPath);
    R = zR.file(e);
  } catch {}
  R = MR.resolvePath(R, ".");
  let a = R.fsPath;
  if (a = a.replaceAll("\\", "/"), a = a.toLowerCase(), !a.endsWith("/")) a += "/";
  return a;
}