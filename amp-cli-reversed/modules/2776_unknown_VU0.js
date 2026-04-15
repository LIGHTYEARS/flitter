async function VU0(T) {
  let R = RhT(T),
    a = NU0(R),
    e = !1;
  try {
    await d9.instance.tuiInstance.clipboard.writeText(a), e = !0;
  } catch (t) {
    J.error("Failed to copy debug prompt", {
      error: t
    });
  }
  return new et(new I3({
    child: new Z3({
      markdown: [e ? "**Copied Markdown debug prompt to clipboard.**" : "**Clipboard copy failed. Select and copy manually.**", "", a].join(`
`)
    })
  }), "Debug Prompt", "info", "help", {
    width: 100,
    height: 28
  });
}