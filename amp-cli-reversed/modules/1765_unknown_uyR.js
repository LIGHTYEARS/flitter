function uyR(T, R, a, e) {
  let {
    client_id: t,
    client_secret: r
  } = R;
  switch (T) {
    case "client_secret_basic":
      yyR(t, r, a);
      return;
    case "client_secret_post":
      PyR(t, r, e);
      return;
    case "none":
      kyR(t, e);
      return;
    default:
      throw Error(`Unsupported client authentication method: ${T}`);
  }
}