function qC0(T) {
  if (T.action === "ask") return 1;
  if (T.action === "reject") return 2;
  return 0;
}
async function zC0(T) {
  let R = T.json ? UC0 : HC0;
  try {
    let a = WC0(T.remainingArgs),
      e = (await T.settings.get("permissions", T.scope)) ?? [],
      t = fj(e);
    if (!t.success) {
      let i = {
        success: !1,
        error: "Invalid permissions configuration",
        details: t.error.issues.map(c => ({
          path: c.path.join("."),
          message: c.message,
          code: c.code
        }))
      };
      R.outputError(T, a, i), T.exit(1);
      return;
    }
    let r = yLT(t.data),
      h = await CD(T.toolName, a, r, T.context, LD, T.threadId, "user");
    if (!h.matchedEntry) h = await CD(T.toolName, a, PN, T.context, LD, T.threadId, "built-in");
    R.outputResult(T, a, h), T.exit(qC0(h));
  } catch (a) {
    let e = {
      success: !1,
      error: a instanceof Error ? a.message : "Unknown error"
    };
    R.outputError(T, {}, e), T.exit(1);
  }
}