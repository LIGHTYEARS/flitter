function Jv0(T) {
  let R = this;
  R.parser = a;
  function a(e) {
    return Yv0(e, {
      ...R.data("settings"),
      ...T,
      extensions: R.data("micromarkExtensions") || [],
      mdastExtensions: R.data("fromMarkdownExtensions") || []
    });
  }
}