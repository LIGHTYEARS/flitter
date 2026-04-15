function wQT(T) {
  let [R = T, ...a] = T.split(" ");
  return {
    command: R,
    editorArgs: a
  };
}
function ud0(T, R, a) {
  let {
      command: e,
      editorArgs: t
    } = wQT(T),
    r = RQ.basename(e).toLowerCase(),
    h = a?.line,
    i = a?.column;
  if (h === void 0) return [...t, R];
  let c = `${R}:${h}${i ? `:${i}` : ""}`;
  if (r === "code" || r === "code-insiders" || r === "codium" || r === "cursor" || r === "windsurf") return [...t, "--goto", c];
  if (r === "zed" || r === "subl" || r === "sublime_text") return [...t, c];
  if (r === "mate") return [...t, "--line", String(h), R];
  if (r === "vi" || r === "vim" || r === "nvim") return [...t, `+${h}`, R];
  return [...t, R];
}