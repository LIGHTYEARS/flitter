function rE0(T) {
  switch (T.kind) {
    case "bash":
      return {
        name: "Bash",
        detail: T.command
      };
    case "edit":
      return {
        name: "Edit",
        detail: `${T.path} +${T.linesAdded} -${T.linesDeleted}`
      };
    case "create-file":
      return {
        name: "Create",
        detail: `${T.path} (${T.linesAdded} ${o9(T.linesAdded, "line")})`
      };
    case "painter":
      return {
        name: "Painter",
        detail: T.prompt ?? T.title
      };
    case "mermaid":
      return {
        name: "Mermaid"
      };
    case "read-web-page":
      return {
        name: "Web Page",
        detail: T.url
      };
    case "generic":
      return {
        name: T.name,
        detail: T.detail
      };
  }
}