function q4R(T) {
  return T.message?.includes("You've reached the usage limit for 'free' mode") ?? !1;
}
function z4R(T) {
  let R = (T.message?.includes("You've exceeded your usage quota of") ?? !1) || (T.message?.includes("You've exceeded your usage limit of") ?? !1),
    a = (T.error?.message?.includes("You've exceeded your usage quota of") ?? !1) || (T.error?.message?.includes("You've exceeded your usage limit of") ?? !1);
  return R || a;
}