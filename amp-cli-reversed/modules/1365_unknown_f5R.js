function x5R(T) {
  return T.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9_-]/g, "").replace(/-+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "agent";
}
function f5R(T) {
  return {
    name: T.name,
    description: `${T.description}

Model: ${T.model}
Tools: ${(T.toolPatterns || ["*"]).join(", ")}`,
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "The instruction or question for the subagent"
        }
      },
      required: ["prompt"]
    },
    source: {
      toolbox: T.sourcePath
    },
    meta: {
      disableTimeout: !0
    }
  };
}