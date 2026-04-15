function f8T(T) {
  if (T.length === 0) return T;
  let R = T.length - 1;
  return T.map((a, e) => {
    if (e === R) return {
      ...a,
      content: s7(a.content, "5m")
    };
    return a;
  });
}