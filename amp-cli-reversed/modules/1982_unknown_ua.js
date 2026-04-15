function ua(T, R) {
  if (T.getOptionValueSourceWithGlobals("dangerouslyAllowAll") === "cli") Ms("dangerouslyAllowAll", R.dangerouslyAllowAll);
  if (T.getOptionValueSourceWithGlobals("mode") === "cli") Ms("experimental.agentMode", R.mode);
}