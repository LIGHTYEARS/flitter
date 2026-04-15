async function kb0(T, R, a) {
  if (await lb0(T, {
    recursive: !0
  }), await GHR(T, R)) {
    if (a) rt.green("\u2713 ripgrep spell successfully conjured");
  } else {
    rt.red("\u2717 Failed to install ripgrep"), process.exitCode = 1;
    return;
  }
}