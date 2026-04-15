function m2R(T) {
  if (!(T instanceof Error)) return;
  return T;
}
function lz(T) {
  if (typeof T === "string") return T;
  if (T instanceof Buffer) return T.toString("utf8");
  return "";
}
function u2R(T) {
  return {
    spec: {
      name: ulR,
      description: "Run a shell command that computes a git diff and return the raw diff text as the tool result.",
      inputSchema: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "Shell command that prints a unified git diff to stdout."
          }
        },
        required: ["command"],
        additionalProperties: !1
      },
      source: "builtin",
      executionProfile: {
        resourceKeys: () => []
      }
    },
    fn: ({
      args: R
    }, a) => Q9(async () => {
      let e = R.command.trim();
      if (!e) return {
        status: "error",
        error: {
          message: "eval_git_diff requires a non-empty command value"
        }
      };
      let t = CzT(a);
      try {
        let {
            stdout: r
          } = await l2R(e, {
            cwd: t,
            encoding: "utf8",
            maxBuffer: 20971520
          }),
          h = lz(r).trimEnd();
        return T.rawDiff = h, {
          status: "done",
          result: h
        };
      } catch (r) {
        let h = m2R(r),
          i = lz(h?.stderr).trim(),
          c = lz(h?.stdout).trim(),
          s = i || c,
          A = typeof h?.code === "number" ? ` (exit code ${h.code})` : "",
          l = r instanceof Error ? r.message : String(r);
        return {
          status: "error",
          error: {
            message: s ? `eval_git_diff failed${A}: ${s}` : `eval_git_diff failed${A}: ${l}`
          }
        };
      }
    })
  };
}