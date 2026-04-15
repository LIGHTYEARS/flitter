function JH0(T) {
  return {
    IntelliJIdea: "IntelliJ IDEA",
    IdeaIC: "IntelliJ IDEA Community Edition",
    WebStorm: "WebStorm",
    WebIde: "PhpStorm/WebStorm",
    PhpStorm: "PhpStorm",
    PyCharm: "PyCharm",
    PyCharmCE: "PyCharm Community Edition",
    RubyMine: "RubyMine",
    CLion: "CLion",
    AppCode: "AppCode",
    DataGrip: "DataGrip",
    GoLand: "GoLand",
    Rider: "Rider",
    AndroidStudio: "Android Studio",
    AndroidStudioPreview: "Android Studio Preview",
    Fleet: "Fleet"
  }[T] || T;
}