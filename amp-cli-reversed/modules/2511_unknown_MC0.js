function MC0(T, R) {
  T.onUntrustedWorkspaceServer = a => {
    let e = R.getSettingsFilePath();
    LC0.write(oR.yellow(`Warning: Untrusted MCP server '${a}' found in workspace settings.
To fix: Add "amp.mcpTrustedWorkspaces": ["${R.getWorkspaceRootPath()}"] to ${e}
`));
  };
}