function NdT(T, R) {
  let a;
  if (T.authority && T.path.length > 1 && T.scheme === "file") a = `//${T.authority}${T.path}`;else if (T.path.charCodeAt(0) === 47 && (T.path.charCodeAt(1) >= 65 && T.path.charCodeAt(1) <= 90 || T.path.charCodeAt(1) >= 97 && T.path.charCodeAt(1) <= 122) && T.path.charCodeAt(2) === 58) {
    if (!R) a = T.path[1].toLowerCase() + T.path.substring(2);else a = T.path.substring(1);
  } else a = T.path;
  if (T.platform === "windows") a = a.replace(/\//g, "\\");
  return a;
}