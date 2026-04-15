function vER(T, R) {
  if (!T) return R;
  let a = T.candidates && R.candidates ? T.candidates.map((t, r) => {
      let h = R.candidates?.[r];
      if (!h) return t;
      return {
        ...h,
        content: {
          role: h.content?.role ?? t.content?.role ?? "model",
          parts: [...(t.content?.parts ?? []), ...(h.content?.parts ?? [])]
        }
      };
    }) : R.candidates,
    e = new M_();
  return Object.assign(e, {
    ...R,
    candidates: a
  }), e;
}