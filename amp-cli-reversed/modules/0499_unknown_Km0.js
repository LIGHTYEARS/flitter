function Km0() {
  try {
    if (Es.getInstance().restoreConsole(), process.stdout.write("\x1B[?1002l"), process.stdout.write("\x1B[?1003l"), process.stdout.write("\x1B[?1004l"), process.stdout.write("\x1B[?1006l"), process.stdout.write("\x1B[?1016l"), process.stdout.write("\x1B[?2004l"), process.stdout.write("\x1B[?2031l"), process.stdout.write("\x1B[?2048l"), process.stdout.write("\x1B[<u"), process.stdout.write("\x1B[?1049l"), process.stdout.write("\x1B[0 q"), process.stdout.write("\x1B[?25h"), process.stdout.write("\x1B[999;1H"), process.stdout.write("\x1B[0m"), !process.env.TERM_PROGRAM?.startsWith("iTerm")) process.stdout.write("\x1B]9;4;0\x1B\\");
  } catch (T) {}
}