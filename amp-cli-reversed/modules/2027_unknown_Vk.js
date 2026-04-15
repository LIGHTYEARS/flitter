class Vk {
  foreground;
  mutedForeground;
  background;
  cursor;
  primary;
  secondary;
  accent;
  border;
  success;
  warning;
  info;
  destructive;
  selection;
  copyHighlight;
  tableBorder;
  constructor({
    foreground: T,
    mutedForeground: R,
    background: a,
    cursor: e,
    primary: t,
    secondary: r,
    accent: h,
    border: i,
    success: c,
    warning: s,
    info: A,
    destructive: l,
    selection: o,
    copyHighlight: n,
    tableBorder: p
  }) {
    this.foreground = T, this.mutedForeground = R, this.background = a, this.cursor = e, this.primary = t, this.secondary = r, this.accent = h, this.border = i, this.success = c, this.warning = s, this.info = A, this.destructive = l, this.selection = o, this.copyHighlight = n, this.tableBorder = p;
  }
  static default() {
    return new Vk({
      foreground: LT.default(),
      mutedForeground: LT.default(),
      background: LT.none(),
      cursor: LT.default(),
      primary: LT.blue,
      secondary: LT.cyan,
      accent: LT.magenta,
      border: LT.default(),
      success: LT.green,
      warning: LT.yellow,
      info: LT.index(12),
      destructive: LT.red,
      selection: LT.index(8),
      copyHighlight: LT.yellow,
      tableBorder: LT.default()
    });
  }
  static fromRgb(T) {
    return new Vk({
      foreground: LT.rgb(T.fg.r, T.fg.g, T.fg.b),
      mutedForeground: LT.rgb(T.indices[7].r, T.indices[7].g, T.indices[7].b),
      background: LT.none(),
      cursor: LT.rgb(T.cursor.r, T.cursor.g, T.cursor.b),
      primary: LT.rgb(T.indices[4].r, T.indices[4].g, T.indices[4].b),
      secondary: LT.rgb(T.indices[6].r, T.indices[6].g, T.indices[6].b),
      accent: LT.rgb(T.indices[5].r, T.indices[5].g, T.indices[5].b),
      border: LT.rgb(T.fg.r, T.fg.g, T.fg.b),
      success: LT.rgb(T.indices[2].r, T.indices[2].g, T.indices[2].b),
      warning: LT.rgb(T.indices[3].r, T.indices[3].g, T.indices[3].b),
      info: LT.rgb(T.indices[6].r, T.indices[6].g, T.indices[6].b),
      destructive: LT.rgb(T.indices[1].r, T.indices[1].g, T.indices[1].b),
      selection: LT.index(8),
      copyHighlight: LT.rgb(T.indices[3].r, T.indices[3].g, T.indices[3].b),
      tableBorder: LT.rgb(T.fg.r, T.fg.g, T.fg.b)
    });
  }
}