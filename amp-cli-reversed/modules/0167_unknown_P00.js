function P00(T, R) {
  switch (R) {
    case "UNSET":
      {
        dR(T, 0);
        break;
      }
    case "OK":
      {
        dR(T, 1);
        break;
      }
    case "ERROR":
      {
        dR(T, 2);
        break;
      }
  }
}