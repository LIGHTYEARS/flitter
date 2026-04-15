function L90(T) {
  return {
    actorId: KR(T),
    connectionId: KR(T),
    connectionToken: KR(T)
  };
}
function M90(T, R) {
  YR(T, R.actorId), YR(T, R.connectionId), YR(T, R.connectionToken);
}
function Z2T(T) {
  return q0(T) ? E0(T) : null;
}
function J2T(T, R) {
  if (z0(T, R !== null), R !== null) C0(T, R);
}
function D90(T) {
  return q0(T) ? UR(T) : null;
}
function w90(T, R) {
  if (z0(T, R !== null), R !== null) HR(T, R);
}
function B90(T) {
  return {
    group: KR(T),
    code: KR(T),
    message: KR(T),
    metadata: Z2T(T),
    actionId: D90(T)
  };
}
function N90(T, R) {
  YR(T, R.group), YR(T, R.code), YR(T, R.message), J2T(T, R.metadata), w90(T, R.actionId);
}
function U90(T) {
  return {
    id: UR(T),
    output: E0(T)
  };
}
function H90(T, R) {
  HR(T, R.id), C0(T, R.output);
}
function W90(T) {
  return {
    name: KR(T),
    args: E0(T)
  };
}
function q90(T, R) {
  YR(T, R.name), C0(T, R.args);
}
function z90(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "Init",
        val: L90(T)
      };
    case 1:
      return {
        tag: "Error",
        val: B90(T)
      };
    case 2:
      return {
        tag: "ActionResponse",
        val: U90(T)
      };
    case 3:
      return {
        tag: "Event",
        val: W90(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}