function e$T(T) {
  Sz0.write(`${Oz0(T)}
`);
}
function dz0(T, R) {
  T.option("-V, --version", "Print the version number and exit", () => {
    e$T(R), process.exit(0);
  }), T.command("version").description("Print the version number and exit").action(() => {
    e$T(R), process.exit(0);
  });
}