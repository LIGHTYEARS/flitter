function mF0(T) {
  let R = ["\u280B", "\u2819", "\u2839", "\u2838", "\u283C", "\u2834", "\u2826", "\u2827", "\u2807", "\u280F"],
    a = 0,
    e = setInterval(() => {
      Be.write(`\r${oR.cyan(R[a])} ${oR.dim(T)}`), a = (a + 1) % R.length;
    }, 80);
  return {
    stop: () => {
      clearInterval(e), Be.write("\r" + " ".repeat(T.length + 3) + "\r");
    }
  };
}