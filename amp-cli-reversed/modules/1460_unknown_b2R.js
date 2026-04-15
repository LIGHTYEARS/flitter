function b2R(T, R, a) {
  return {
    spec: {
      name: ylR,
      description: "Post one markdown explanation section for the code tour.",
      inputSchema: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "Markdown text for this explanation section."
          },
          file: {
            type: "string",
            description: "Optional file path that this explanation section refers to."
          },
          lineRanges: {
            type: "array",
            description: "Optional file line ranges for this explanation. Use this for non-contiguous or multi-file references.",
            items: {
              type: "object",
              properties: {
                file: {
                  type: "string",
                  description: "Optional file path for this range. Defaults to top-level file when omitted."
                },
                startLine: {
                  type: "number",
                  description: "Starting line for this range."
                },
                endLine: {
                  type: "number",
                  description: "Optional ending line for this range. Defaults to startLine."
                }
              },
              required: ["startLine"],
              additionalProperties: !1
            }
          },
          diff: {
            type: "string",
            description: "Optional unified diff hunk for this explanation. Should be a valid unified diff snippet (with --- and +++ headers and @@ hunk headers)."
          }
        },
        required: ["text"]
      },
      source: "builtin",
      executionProfile: {
        resourceKeys: () => []
      }
    },
    fn: ({
      args: e
    }) => Q9(async () => {
      let t = _2R(e);
      if (!t) return {
        status: "error",
        error: {
          message: "post_explanation requires a non-empty text value"
        }
      };
      if (!T.coreExplanations) T.coreExplanations = [];
      T.coreExplanations.push(t);
      try {
        await LzT(a, R, DzT(T));
      } catch (r) {
        return T.coreExplanations.pop(), {
          status: "error",
          error: {
            message: `Failed to persist explanation artifact: ${r instanceof Error ? r.message : String(r)}`
          }
        };
      }
      return {
        status: "done",
        result: "Explanation posted"
      };
    })
  };
}