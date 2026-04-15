function aPR(T) {
  return {
    AGENT: "amp",
    AGENT_THREAD_ID: T?.thread?.id || "",
    AMP_CURRENT_THREAD_ID: T?.thread?.id || ""
  };
}
function ePR(T, R) {
  let a = aPR(R);
  return {
    ...T,
    ...a
  };
}
function hDT(T, R = "always", a) {
  return AR.of(ePR(iDT, a));
}
class sDT {
  recordEvent() {}
}