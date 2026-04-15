class JH {
  vertical = "\u2502";
  tee = "\u251C";
  elbow = "\u2570";
  horizontal = "\u2500";
  indent = 4;
  connectorColor;
  connectorDim = !0;
  constructor({
    connectorColor: T
  } = {}) {
    this.connectorColor = T ?? Xa.default().colors.foreground;
  }
  getConnectorText(T) {
    let R = Math.max(2, this.indent),
      a = Math.max(0, R - 2),
      e = this.horizontal.repeat(a);
    return T + e + " ";
  }
  getAncestorPrefix(T) {
    let R = Math.max(2, this.indent);
    if (T) return " ".repeat(R);
    return this.vertical + " ".repeat(R - 1);
  }
}