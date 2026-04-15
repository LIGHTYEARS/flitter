function Js(T) {
  if (!T) return;
  return {
    [IwT]: "true",
    [d0T]: "dtw"
  };
}
function P8T(T) {
  if (!T) return;
  return {
    [IwT]: "true",
    [d0T]: "dtw",
    Authorization: `Bearer ${T}`
  };
}
function GfR(T) {
  return T.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function PO(T) {
  return `<attached_image path="${GfR(T.sourcePath)}">The following image is from the source above.</attached_image>`;
}
function ZN(T) {
  if (T.source.type !== "base64") return null;
  let R = XA({
    source: {
      type: "base64",
      data: T.source.data
    }
  });
  if (!R) return null;
  return `Image omitted from ${T.sourcePath}: ${R}`;
}