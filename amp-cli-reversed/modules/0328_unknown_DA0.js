function DA0(T) {
  return {
    name: T.name,
    description: T.description ?? "",
    inputSchema: {
      type: "object",
      properties: T.inputSchema.properties ?? {},
      required: T.inputSchema.required,
      additionalProperties: T.inputSchema.additionalProperties
    },
    source: T.source,
    meta: MA0(T)
  };
}