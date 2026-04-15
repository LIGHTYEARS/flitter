function Pp(T) {
  return new Gt({
    colorScheme: new Vk({
      foreground: T.foreground,
      mutedForeground: T.mutedForeground,
      background: T.background,
      cursor: T.cursor,
      primary: T.primary,
      secondary: T.secondary,
      accent: T.accent,
      border: T.border,
      success: T.success,
      warning: T.warning,
      info: T.info,
      destructive: T.destructive,
      selection: T.selection,
      copyHighlight: T.copyHighlight,
      tableBorder: T.tableBorder
    })
  });
}