async function zz0(T) {
  if (!T.executeMode) {
    if (!(await OtT("Would you like to log in to Amp? [(y)es, (n)o]: "))) return C9.write(`Login cancelled. Run the command again to retry.
`), !1;
  }
  return await r3R(T);
}