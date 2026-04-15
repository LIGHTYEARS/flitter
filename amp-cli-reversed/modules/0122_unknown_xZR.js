function xZR(T, R) {
  switch (R.tag) {
    case "ActionEvent":
      {
        dR(T, 0), lZR(T, R.val);
        break;
      }
    case "BroadcastEvent":
      {
        dR(T, 1), pZR(T, R.val);
        break;
      }
    case "SubscribeEvent":
      {
        dR(T, 2), bZR(T, R.val);
        break;
      }
    case "UnSubscribeEvent":
      {
        dR(T, 3), uZR(T, R.val);
        break;
      }
    case "FiredEvent":
      {
        dR(T, 4), PZR(T, R.val);
        break;
      }
  }
}