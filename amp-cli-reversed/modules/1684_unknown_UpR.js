async function UpR(T, R, a, e, t, r) {
  if (T.action !== "delegate") {
    if (T.action === "reject" && T.message) return {
      action: T.action,
      matchedEntry: T,
      error: T.message
    };
    return {
      action: T.action,
      matchedEntry: T
    };
  }
  if (!a || !T.to) return {
    action: null,
    matchedEntry: T,
    error: "No spawn function provided"
  };
  try {
    let h = await HpR(T.to, R, a, e, t, r);
    return WpR(h, T);
  } catch (h) {
    return {
      action: "reject",
      error: h instanceof Error ? h.message : "Unknown error",
      matchedEntry: T
    };
  }
}