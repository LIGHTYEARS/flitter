function tQT(T, R) {
  let a = -1,
    e;
  if (R.extensions) while (++a < R.extensions.length) tQT(T, R.extensions[a]);
  for (e in R) if (Rj0.call(R, e)) switch (e) {
    case "extensions":
      break;
    case "unsafe":
      {
        FfT(T[e], R[e]);
        break;
      }
    case "join":
      {
        FfT(T[e], R[e]);
        break;
      }
    case "handlers":
      {
        aj0(T[e], R[e]);
        break;
      }
    default:
      T.options[e] = R[e];
  }
  return T;
}