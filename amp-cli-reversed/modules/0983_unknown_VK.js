function V8T(T) {
  if (T.length === 0) return [];
  return [{
    functionDeclarations: [...T.map(IER)]
  }];
}
function IER(T) {
  return {
    name: T.name,
    description: T.description ?? "",
    parameters: VK(T.inputSchema)
  };
}
function VK(T) {
  let R = {},
    a = hNT[T.type ?? "any"];
  if (a) R.type = a;
  if (T.description) R.description = T.description;
  if (T.required) R.required = T.required;
  let e = T.examples;
  if (Array.isArray(e) && e.length > 0) R.example = e[0];
  if (T.properties) R.properties = Object.fromEntries(Object.entries(T.properties).map(([t, r]) => [t, VK(r)]));
  if (T.items) R.items = VK(T.items);
  return R;
}