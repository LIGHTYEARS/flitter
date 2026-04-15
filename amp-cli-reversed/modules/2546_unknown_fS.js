async function fS() {
  let T = await j40();
  if (T.timedOut) throw new cB("Timeout while reading from stdin");
  if (T.truncated) J.warn(`Warning: stdin input was truncated at ${T.bytesRead} bytes`);
  return T.content;
}