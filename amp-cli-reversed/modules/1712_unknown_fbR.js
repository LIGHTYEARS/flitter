function J2(T) {
  return T.map(Z2).join(`
`);
}
function fbR(T) {
  return T.configService.config.pipe(JR(R => {
    if (R.settings?.dangerouslyAllowAll === !0) return [{
      tool: "*",
      action: "allow"
    }];
    return I0T(R.settings?.permissions);
  }), E9());
}