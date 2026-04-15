function gg(T) {
  return [{
    type: "text",
    text: T
  }];
}
function mD0(T) {
  switch (T) {
    case "public":
    case "unlisted":
    case "private":
    case "workspace":
    case "group":
      return T;
    default:
      return null;
  }
}
function uQ(T) {
  if (!T || typeof T !== "object") return "unknown";
  let R = T;
  if (Array.isArray(R.type)) return R.type.join(" | ");
  if (R.type === "array") return `array<${uQ(R.items)}>`;
  if (typeof R.type === "string") return R.type;
  if (Array.isArray(R.enum) && R.enum.length > 0) return `enum(${R.enum.map(String).join(", ")})`;
  let a = R.anyOf ?? R.oneOf;
  if (Array.isArray(a) && a.length > 0) return Array.from(new Set(a.map(uQ))).join(" | ");
  return "unknown";
}