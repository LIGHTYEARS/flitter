function v5R(T, R) {
  let a = {},
    e = [];
  for (let [r, h] of Object.entries(T.parameters)) {
    let i;
    switch (h.type.toLowerCase()) {
      case "boolean":
        i = "boolean";
        break;
      case "number":
      case "integer":
        i = h.type.toLowerCase();
        break;
      case "array":
        i = "array";
        break;
      case "object":
        i = "object";
        break;
      default:
        i = "string";
    }
    if (a[r] = {
      type: i,
      description: h.description
    }, !h.optional) e.push(r);
  }
  let t = {
    type: "object",
    properties: a,
    required: e,
    additionalProperties: !1
  };
  return {
    name: T.name,
    description: T.description,
    inputSchema: t,
    source: {
      toolbox: R
    }
  };
}