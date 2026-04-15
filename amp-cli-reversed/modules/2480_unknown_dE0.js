function OE0(T) {
  if (T.kind !== "file" && T.kind !== "folder") throw Error("Invalid completion item: missing path or kind");
  return {
    type: "file",
    path: T.path,
    kind: T.kind
  };
}
function dE0(T) {
  switch (T.type) {
    case "file":
      return T.path;
    case "hint":
      return `${CE0(T.kind)} ${T.message}`;
    case "commit":
      return `${T.shortHash} ${T.message} (${T.relativeDate})`;
  }
}