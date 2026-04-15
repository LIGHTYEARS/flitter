function T7T(T, R = [y8, mET]) {
  let a = [];
  for (let e of T.messages) if (e.role === "assistant") {
    for (let t of e.content) if (t.type === "tool_use" && R.includes(t.name)) {
      if (t.name === "Read" || t.name === "read_file") {
        let r = cN(T, t.id);
        if (r && r.run.status === "done") {
          let h = r.run.result;
          if (typeof h === "object" && h.absolutePath) a.push(zR.file(h.absolutePath));
        }
      } else if (t.input && typeof t.input === "object" && "path" in t.input && typeof t.input.path === "string") a.push(zR.file(t.input.path));
    }
  }
  for (let e of T.messages) if (e.role === "user" && e.fileMentions) for (let t of e.fileMentions.files) a.push(t.uri);
  return a;
}