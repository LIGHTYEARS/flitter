function Vw(T) {
  if (!ye(T)) return;
  let R = typeof T.normalized_name === "string" ? T.normalized_name : typeof T.tool_name === "string" ? T.tool_name : void 0;
  if (!R) return;
  let a = ye(T.input) ? T.input : {};
  if (R === "Bash" || R === "shell_command") {
    let e = M1T(a);
    if (!e) return {
      kind: "explore",
      title: ms(R, a)
    };
    let t = WO(e);
    if (t.kind !== "command") {
      let r = B1T(t);
      if (r) return {
        kind: t.kind,
        title: r
      };
    }
    return {
      kind: "explore",
      title: `Bash ${e}`
    };
  }
  if (R === "Read" || R === "read_thread" || R === "get_diagnostics" || R === "skill") return {
    kind: "read",
    title: ms(R, a)
  };
  if (R === "file_tree") return {
    kind: "list",
    title: ms(R, a)
  };
  if (R === "glob" || R === "Grep" || R === "find_thread") return {
    kind: "search",
    title: ms(R, a)
  };
  if (R === "web_search") return {
    kind: "web",
    title: ms(R, a)
  };
  if (R === "read_web_page") return;
  return {
    kind: "explore",
    title: ms(R, a)
  };
}