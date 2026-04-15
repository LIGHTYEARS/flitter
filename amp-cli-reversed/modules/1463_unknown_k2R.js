async function k2R(T, R, a, e, t) {
  let r = T.status === "error" ? T.turns?.length ?? 0 : T.turns.length,
    h = R.rawDiff,
    i = typeof h === "string" && h.length > 0;
  if (r > 0 && i && !R.structuredDiff) R.structuredDiff = RS(h);
  if (R.structuredDiff) R.remainingHunks = HX(R.structuredDiff, R.coreExplanations ?? []);
  if (T.status !== "done") return T;
  if (!R.structuredDiff) R.structuredDiff = RS(R.rawDiff ?? "");
  R.remainingHunks = HX(R.structuredDiff, R.coreExplanations ?? []);
  try {
    return await LzT(t, a, DzT(R)), T;
  } catch (c) {
    return J.error("Failed to write code tour artifact JSON", {
      path: e,
      error: c instanceof Error ? c.message : String(c)
    }), {
      status: "error",
      message: "Failed to write code tour artifact JSON",
      turns: T.turns
    };
  }
}