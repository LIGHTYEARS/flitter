async function rcT(T, R, a) {
  if (a?.dangerouslyAllowAll ?? !1) return {
    requiresConsent: !1
  };
  try {
    let e = await MpR(T, R, a["guardedFiles.allowlist"] ?? []);
    if (e) return {
      requiresConsent: !0,
      reason: `${e.pattern.description}`,
      toAllow: T.fsPath
    };
    return {
      requiresConsent: !1
    };
  } catch {
    return {
      requiresConsent: !0,
      reason: "Unable to resolve file path",
      toAllow: T.fsPath
    };
  }
}